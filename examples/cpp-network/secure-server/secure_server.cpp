#include <arpa/inet.h>
#include <fcntl.h>
#include <netinet/in.h>
#include <openssl/crypto.h>
#include <openssl/err.h>
#include <openssl/ssl.h>
#include <poll.h>
#include <signal.h>
#include <sys/socket.h>
#include <sys/stat.h>
#include <unistd.h>

#include <array>
#include <atomic>
#include <charconv>
#include <chrono>
#include <condition_variable>
#include <cstdint>
#include <cstdlib>
#include <deque>
#include <iostream>
#include <memory>
#include <mutex>
#include <stdexcept>
#include <string>
#include <string_view>
#include <thread>
#include <vector>

namespace {
using Clock = std::chrono::steady_clock;
constexpr auto request_timeout = std::chrono::seconds(5);
constexpr std::size_t max_message = 4096;
constexpr std::size_t max_token = 256;
constexpr std::size_t worker_count = 4;
constexpr std::size_t queue_limit = 4;
volatile sig_atomic_t stopping = 0;

void on_signal(int) { stopping = 1; }

struct Socket {
    int fd = -1;
    explicit Socket(int value = -1) : fd(value) {}
    ~Socket() { if (fd >= 0) ::close(fd); }
    Socket(const Socket&) = delete;
    Socket& operator=(const Socket&) = delete;
    Socket(Socket&& other) noexcept : fd(other.fd) { other.fd = -1; }
    Socket& operator=(Socket&& other) noexcept {
        if (this != &other) {
            if (fd >= 0) ::close(fd);
            fd = other.fd;
            other.fd = -1;
        }
        return *this;
    }
};

using Context = std::unique_ptr<SSL_CTX, decltype(&SSL_CTX_free)>;
using Session = std::unique_ptr<SSL, decltype(&SSL_free)>;

void require(bool condition, const char* message) {
    if (!condition) throw std::runtime_error(message);
}

int parse_port(std::string_view text) {
    unsigned value = 0;
    const auto [end, error] = std::from_chars(text.data(), text.data() + text.size(), value);
    require(error == std::errc{} && end == text.data() + text.size() && value <= 65535,
            "port must be 0..65535");
    return static_cast<int>(value);
}

void set_nonblocking(int fd) {
    const int flags = fcntl(fd, F_GETFL, 0);
    require(flags >= 0 && fcntl(fd, F_SETFL, flags | O_NONBLOCK) == 0, "nonblocking socket failed");
}

void wait_for(int fd, short events, Clock::time_point deadline) {
    for (;;) {
        const auto remaining = std::chrono::duration_cast<std::chrono::milliseconds>(
            deadline - Clock::now() + std::chrono::milliseconds(1));
        require(remaining.count() > 0, "request timed out");
        pollfd pending{fd, events, 0};
        const int ready = ::poll(&pending, 1, static_cast<int>(remaining.count()));
        if (ready > 0) {
            if ((pending.revents & (POLLERR | POLLNVAL)) != 0 ||
                ((pending.revents & POLLHUP) != 0 && (pending.revents & events) == 0))
                throw std::runtime_error("socket closed while waiting for TLS I/O");
            return;
        }
        if (ready == 0) throw std::runtime_error("request timed out");
        if (errno != EINTR) throw std::runtime_error("socket poll failed");
    }
}

void retry_tls(int fd, SSL* session, int result, Clock::time_point deadline) {
    const int error = SSL_get_error(session, result);
    if (error == SSL_ERROR_WANT_READ) wait_for(fd, POLLIN, deadline);
    else if (error == SSL_ERROR_WANT_WRITE) wait_for(fd, POLLOUT, deadline);
    else throw std::runtime_error("TLS operation failed");
}

void handshake(int fd, SSL* session, Clock::time_point deadline) {
    for (;;) {
        require(Clock::now() < deadline, "request timed out");
        ERR_clear_error();
        const int result = SSL_accept(session);
        if (result == 1) return;
        retry_tls(fd, session, result, deadline);
    }
}

void read_exact(int fd, SSL* session, void* output, std::size_t length, Clock::time_point deadline) {
    auto* bytes = static_cast<unsigned char*>(output);
    while (length > 0) {
        require(Clock::now() < deadline, "request timed out");
        std::size_t count = 0;
        ERR_clear_error();
        const int result = SSL_read_ex(session, bytes, length, &count);
        if (result == 1) {
            require(count > 0, "empty TLS read");
            bytes += count;
            length -= count;
        } else {
            retry_tls(fd, session, result, deadline);
        }
    }
}

void write_all(int fd, SSL* session, const void* input, std::size_t length, Clock::time_point deadline) {
    const auto* bytes = static_cast<const unsigned char*>(input);
    while (length > 0) {
        require(Clock::now() < deadline, "request timed out");
        std::size_t count = 0;
        ERR_clear_error();
        const int result = SSL_write_ex(session, bytes, length, &count);
        if (result == 1) {
            require(count > 0, "empty TLS write");
            bytes += count;
            length -= count;
        } else {
            retry_tls(fd, session, result, deadline);
        }
    }
}

std::uint16_t read_u16(int fd, SSL* session, Clock::time_point deadline) {
    std::array<unsigned char, 2> bytes{};
    read_exact(fd, session, bytes.data(), bytes.size(), deadline);
    return static_cast<std::uint16_t>((bytes[0] << 8) | bytes[1]);
}

std::uint32_t read_u32(int fd, SSL* session, Clock::time_point deadline) {
    std::array<unsigned char, 4> bytes{};
    read_exact(fd, session, bytes.data(), bytes.size(), deadline);
    return (static_cast<std::uint32_t>(bytes[0]) << 24) |
           (static_cast<std::uint32_t>(bytes[1]) << 16) |
           (static_cast<std::uint32_t>(bytes[2]) << 8) | bytes[3];
}

void handle(Socket peer, SSL_CTX* context, const std::string& expected_token,
            Clock::time_point deadline) {
    try {
        require(Clock::now() < deadline, "request timed out");
        set_nonblocking(peer.fd);
        Session session(SSL_new(context), SSL_free);
        require(session != nullptr && SSL_set_fd(session.get(), peer.fd) == 1, "TLS setup failed");
        handshake(peer.fd, session.get(), deadline);

        const auto token_length = read_u16(peer.fd, session.get(), deadline);
        require(token_length > 0 && token_length <= max_token, "invalid token length");
        std::array<unsigned char, max_token> supplied{};
        read_exact(peer.fd, session.get(), supplied.data(), token_length, deadline);
        require(token_length == expected_token.size() &&
                CRYPTO_memcmp(supplied.data(), expected_token.data(), token_length) == 0,
                "authentication failed");

        const auto length = read_u32(peer.fd, session.get(), deadline);
        require(length <= max_message, "frame too large");
        std::array<unsigned char, max_message> message{};
        read_exact(peer.fd, session.get(), message.data(), length, deadline);
        const std::array<unsigned char, 4> header{
            static_cast<unsigned char>(length >> 24), static_cast<unsigned char>(length >> 16),
            static_cast<unsigned char>(length >> 8), static_cast<unsigned char>(length)};
        write_all(peer.fd, session.get(), header.data(), header.size(), deadline);
        write_all(peer.fd, session.get(), message.data(), length, deadline);
        // A completed response is followed by a best-effort TLS close notification.
        SSL_shutdown(session.get());
    } catch (const std::exception&) {
        // Do not log tokens, payloads, or peer addresses from rejected requests.
    }
}

struct WorkQueue {
    struct Accepted {
        Socket peer;
        Clock::time_point deadline;
    };
    std::mutex mutex;
    std::condition_variable ready;
    std::deque<Accepted> pending;
    std::size_t active = 0;
    bool closed = false;
};

void worker(WorkQueue& queue, SSL_CTX* context, const std::string& token) {
    for (;;) {
        WorkQueue::Accepted accepted{Socket{}, Clock::time_point{}};
        {
            std::unique_lock lock(queue.mutex);
            queue.ready.wait(lock, [&] { return queue.closed || !queue.pending.empty(); });
            if (queue.pending.empty()) return;
            accepted = std::move(queue.pending.front());
            queue.pending.pop_front();
            ++queue.active;
        }
        handle(std::move(accepted.peer), context, token, accepted.deadline);
        {
            std::lock_guard lock(queue.mutex);
            --queue.active;
        }
    }
}

void run(const char* certificate, const char* key, int port, const std::string& token) {
    struct stat key_info{};
    require(::stat(key, &key_info) == 0 && S_ISREG(key_info.st_mode) &&
            (key_info.st_mode & 077) == 0, "private key must be a private regular file");
    Context context(SSL_CTX_new(TLS_server_method()), SSL_CTX_free);
    require(context != nullptr, "TLS context failed");
    require(SSL_CTX_set_min_proto_version(context.get(), TLS1_3_VERSION) == 1 &&
            SSL_CTX_set_max_proto_version(context.get(), TLS1_3_VERSION) == 1,
            "TLS 1.3 configuration failed");
    require(SSL_CTX_use_certificate_chain_file(context.get(), certificate) == 1 &&
            SSL_CTX_use_PrivateKey_file(context.get(), key, SSL_FILETYPE_PEM) == 1 &&
            SSL_CTX_check_private_key(context.get()) == 1, "certificate and key failed validation");
    SSL_CTX_set_num_tickets(context.get(), 0);

    Socket listener(::socket(AF_INET, SOCK_STREAM, 0));
    require(listener.fd >= 0, "socket creation failed");
    const int reuse = 1;
    require(::setsockopt(listener.fd, SOL_SOCKET, SO_REUSEADDR, &reuse, sizeof reuse) == 0,
            "reuse address failed");
    sockaddr_in address{};
    address.sin_family = AF_INET;
    address.sin_port = htons(static_cast<std::uint16_t>(port));
    address.sin_addr.s_addr = htonl(INADDR_LOOPBACK);
    require(::bind(listener.fd, reinterpret_cast<const sockaddr*>(&address), sizeof address) == 0,
            "loopback bind failed");
    require(::listen(listener.fd, static_cast<int>(worker_count + queue_limit)) == 0, "listen failed");
    set_nonblocking(listener.fd);
    socklen_t address_size = sizeof address;
    require(::getsockname(listener.fd, reinterpret_cast<sockaddr*>(&address), &address_size) == 0,
            "local port lookup failed");

    WorkQueue queue;
    std::vector<std::thread> workers;
    workers.reserve(worker_count);
    for (std::size_t i = 0; i < worker_count; ++i)
        workers.emplace_back(worker, std::ref(queue), context.get(), std::cref(token));
    std::cout << "TLS listening on 127.0.0.1:" << ntohs(address.sin_port) << std::endl;
    while (!stopping) {
        pollfd pending{listener.fd, POLLIN, 0};
        const int ready = ::poll(&pending, 1, 200);
        if (ready < 0) {
            if (errno == EINTR) continue;
            break;
        }
        if (ready == 0) continue;
        for (std::size_t accepted_this_round = 0;
             !stopping && accepted_this_round < 64; ++accepted_this_round) {
            Socket peer(::accept(listener.fd, nullptr, nullptr));
            if (peer.fd < 0) {
                if (errno == EINTR) continue;
                if (errno == EAGAIN || errno == EWOULDBLOCK) break;
                stopping = 1;
                break;
            }
            std::lock_guard lock(queue.mutex);
            if (queue.active + queue.pending.size() < worker_count + queue_limit) {
                queue.pending.push_back({std::move(peer), Clock::now() + request_timeout});
                queue.ready.notify_one();
            }
        }
    }
    {
        std::lock_guard lock(queue.mutex);
        queue.closed = true;
    }
    queue.ready.notify_all();
    for (auto& thread : workers) thread.join();
}
} // namespace

int main(int argc, char* argv[]) {
    if (argc != 3 && argc != 4) {
        std::cerr << "usage: secure_server certificate.pem private-key.pem [port]\n";
        return 2;
    }
    try {
        const char* raw_token = std::getenv("ONETASK_LAB_TOKEN");
        require(raw_token != nullptr, "ONETASK_LAB_TOKEN is required");
        const std::string token(raw_token);
        require(token.size() >= 32 && token.size() <= max_token,
                "ONETASK_LAB_TOKEN must contain 32..256 bytes");
        const int port = argc == 4 ? parse_port(argv[3]) : 40406;
        struct sigaction action{};
        action.sa_handler = on_signal;
        sigemptyset(&action.sa_mask);
        sigaction(SIGINT, &action, nullptr);
        sigaction(SIGTERM, &action, nullptr);
        signal(SIGPIPE, SIG_IGN);
        run(argv[1], argv[2], port, token);
    } catch (const std::exception& error) {
        std::cerr << error.what() << '\n';
        return 1;
    }
}
