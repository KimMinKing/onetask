// Linux/POSIX loopback-only TCP/UDP echo lab. Build with: g++ -std=c++20 -Wall -Wextra -Wpedantic -O2 socket_lab.cpp -o socket_lab
#include <arpa/inet.h>
#include <cerrno>
#include <chrono>
#include <cstdint>
#include <cstring>
#include <iostream>
#include <poll.h>
#include <stdexcept>
#include <string>
#include <string_view>
#include <sys/socket.h>
#include <unistd.h>

namespace {
constexpr std::size_t max_message = 4096;
constexpr std::uint16_t tcp_port = 40404;
constexpr std::uint16_t udp_port = 40405;
using Clock = std::chrono::steady_clock;

struct Socket {
    int fd;
    explicit Socket(int value) : fd(value) { if (fd < 0) throw std::runtime_error(std::strerror(errno)); }
    ~Socket() { if (fd >= 0) ::close(fd); }
    Socket(const Socket&) = delete;
    Socket& operator=(const Socket&) = delete;
};

sockaddr_in loopback(std::uint16_t port) {
    sockaddr_in address{};
    address.sin_family = AF_INET;
    address.sin_port = htons(port);
    address.sin_addr.s_addr = htonl(INADDR_LOOPBACK);
    return address;
}

void check(int result, const char* operation) {
    if (result < 0) throw std::runtime_error(std::string(operation) + ": " + std::strerror(errno));
}

void timeout(int fd) {
    timeval duration{5, 0};
    check(::setsockopt(fd, SOL_SOCKET, SO_RCVTIMEO, &duration, sizeof duration), "receive timeout");
    check(::setsockopt(fd, SOL_SOCKET, SO_SNDTIMEO, &duration, sizeof duration), "send timeout");
}

void send_all(int fd, const char* data, std::size_t size) {
    while (size) {
        const ssize_t count = ::send(fd, data, size, MSG_NOSIGNAL);
        if (count < 0 && errno == EINTR) continue;
        if (count <= 0) throw std::runtime_error("TCP send failed or timed out");
        data += count;
        size -= static_cast<std::size_t>(count);
    }
}

void wait_readable(int fd, Clock::time_point deadline) {
    for (;;) {
        const auto remaining = std::chrono::duration_cast<std::chrono::microseconds>(deadline - Clock::now());
        if (remaining.count() <= 0) throw std::runtime_error("TCP receive timed out");
        const auto milliseconds = std::chrono::duration_cast<std::chrono::milliseconds>(
            remaining + std::chrono::microseconds(999));
        pollfd readable{fd, POLLIN, 0};
        const int ready = ::poll(&readable, 1, static_cast<int>(milliseconds.count()));
        if (ready > 0) return;
        if (ready == 0) throw std::runtime_error("TCP receive timed out");
        if (errno != EINTR) throw std::runtime_error(std::string("TCP poll failed: ") + std::strerror(errno));
    }
}

void recv_exact(int fd, char* data, std::size_t size, Clock::time_point deadline) {
    while (size) {
        wait_readable(fd, deadline);
        const ssize_t count = ::recv(fd, data, size, 0);
        if (count < 0 && errno == EINTR) continue;
        if (count == 0) throw std::runtime_error("TCP connection closed before full frame");
        if (count < 0 && (errno == EAGAIN || errno == EWOULDBLOCK)) throw std::runtime_error("TCP receive timed out");
        if (count < 0) throw std::runtime_error(std::string("TCP receive failed: ") + std::strerror(errno));
        data += count;
        size -= static_cast<std::size_t>(count);
    }
}

int accept_one(int listener) {
    for (;;) {
        const int peer = ::accept(listener, nullptr, nullptr);
        if (peer >= 0) return peer;
        if (errno == EINTR) continue;
        if (errno == EAGAIN || errno == EWOULDBLOCK) throw std::runtime_error("TCP accept timed out");
        throw std::runtime_error(std::string("TCP accept failed: ") + std::strerror(errno));
    }
}

void send_frame(int fd, std::string_view message) {
    if (message.size() > max_message) throw std::runtime_error("message exceeds 4096 bytes");
    const std::uint32_t length = htonl(static_cast<std::uint32_t>(message.size()));
    send_all(fd, reinterpret_cast<const char*>(&length), sizeof length);
    send_all(fd, message.data(), message.size());
}

std::string recv_frame(int fd) {
    const auto deadline = Clock::now() + std::chrono::seconds(5);
    std::uint32_t length{};
    recv_exact(fd, reinterpret_cast<char*>(&length), sizeof length, deadline);
    const auto size = ntohl(length);
    if (size > max_message) throw std::runtime_error("frame exceeds 4096 bytes");
    std::string message(size, '\0');
    recv_exact(fd, message.data(), size, deadline);
    return message;
}

void tcp_server() {
    Socket listener(::socket(AF_INET, SOCK_STREAM, 0));
    timeout(listener.fd);
    const int reuse = 1;
    check(::setsockopt(listener.fd, SOL_SOCKET, SO_REUSEADDR, &reuse, sizeof reuse), "reuse address");
    const auto address = loopback(tcp_port);
    check(::bind(listener.fd, reinterpret_cast<const sockaddr*>(&address), sizeof address), "bind");
    check(::listen(listener.fd, 1), "listen");
    std::cout << "TCP listening on 127.0.0.1:" << tcp_port << std::endl;
    Socket peer(accept_one(listener.fd));
    timeout(peer.fd);
    send_frame(peer.fd, recv_frame(peer.fd));
}

void tcp_client(std::string_view message) {
    if (message.size() > max_message) throw std::runtime_error("message exceeds 4096 bytes");
    Socket peer(::socket(AF_INET, SOCK_STREAM, 0));
    timeout(peer.fd);
    const auto address = loopback(tcp_port);
    check(::connect(peer.fd, reinterpret_cast<const sockaddr*>(&address), sizeof address), "connect");
    send_frame(peer.fd, message);
    std::cout << recv_frame(peer.fd) << '\n';
}

void udp_server() {
    Socket server(::socket(AF_INET, SOCK_DGRAM, 0));
    timeout(server.fd);
    const auto address = loopback(udp_port);
    check(::bind(server.fd, reinterpret_cast<const sockaddr*>(&address), sizeof address), "bind");
    std::cout << "UDP listening on 127.0.0.1:" << udp_port << std::endl;
    char buffer[max_message + 1];
    sockaddr_in sender{};
    socklen_t sender_size = sizeof sender;
    // MSG_TRUNC returns the datagram's original size, so oversized input is rejected.
    ssize_t count;
    do {
        count = ::recvfrom(server.fd, buffer, sizeof buffer, MSG_TRUNC,
                           reinterpret_cast<sockaddr*>(&sender), &sender_size);
    } while (count < 0 && errno == EINTR);
    if (count < 0 && (errno == EAGAIN || errno == EWOULDBLOCK)) throw std::runtime_error("UDP receive timed out");
    if (count < 0) throw std::runtime_error(std::string("UDP receive failed: ") + std::strerror(errno));
    if (count > static_cast<ssize_t>(max_message)) throw std::runtime_error("datagram exceeds 4096 bytes");
    const ssize_t sent = ::sendto(server.fd, buffer, static_cast<std::size_t>(count), 0,
                                  reinterpret_cast<const sockaddr*>(&sender), sender_size);
    if (sent != count) throw std::runtime_error("UDP echo failed");
}

void udp_client(std::string_view message) {
    if (message.size() > max_message) throw std::runtime_error("message exceeds 4096 bytes");
    Socket peer(::socket(AF_INET, SOCK_DGRAM, 0));
    timeout(peer.fd);
    const auto address = loopback(udp_port);
    check(::connect(peer.fd, reinterpret_cast<const sockaddr*>(&address), sizeof address), "connect");
    const ssize_t sent = ::send(peer.fd, message.data(), message.size(), 0);
    if (sent != static_cast<ssize_t>(message.size())) throw std::runtime_error("UDP send failed");
    char buffer[max_message + 1];
    ssize_t count;
    do { count = ::recv(peer.fd, buffer, sizeof buffer, MSG_TRUNC); }
    while (count < 0 && errno == EINTR);
    if (count < 0 && (errno == EAGAIN || errno == EWOULDBLOCK)) throw std::runtime_error("UDP receive timed out");
    if (count < 0) throw std::runtime_error(std::string("UDP receive failed: ") + std::strerror(errno));
    if (count > static_cast<ssize_t>(max_message)) throw std::runtime_error("reply exceeds 4096 bytes");
    std::cout.write(buffer, count);
    std::cout << '\n';
}
} // namespace

int main(int argc, char** argv) {
    if (argc < 2 || argc > 3) {
        std::cerr << "usage: socket_lab tcp-server|tcp-client|udp-server|udp-client [message]\n";
        return 2;
    }
    try {
        const std::string_view mode = argv[1];
        if (mode == "tcp-server" && argc == 2) tcp_server();
        else if (mode == "udp-server" && argc == 2) udp_server();
        else if (mode == "tcp-client" && argc == 3) tcp_client(argv[2]);
        else if (mode == "udp-client" && argc == 3) udp_client(argv[2]);
        else throw std::runtime_error("invalid mode or missing message");
    } catch (const std::exception& error) {
        std::cerr << error.what() << '\n';
        return 1;
    }
}
