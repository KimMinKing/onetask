// Windows Winsock loopback-only companion to socket_lab.cpp.
// Build: g++ -std=c++20 -Wall -Wextra -Wpedantic -Werror socket_lab_windows.cpp -o socket_lab_windows.exe -lws2_32
#include <winsock2.h>
#include <ws2tcpip.h>

#include <cstdint>
#include <chrono>
#include <iostream>
#include <stdexcept>
#include <string>
#include <string_view>

namespace {
constexpr std::size_t max_message = 4096;
constexpr std::uint16_t tcp_port = 40404;
constexpr std::uint16_t udp_port = 40405;
using Clock = std::chrono::steady_clock;

struct Winsock {
    Winsock() {
        WSADATA data{};
        if (WSAStartup(MAKEWORD(2, 2), &data) != 0) throw std::runtime_error("WSAStartup failed");
    }
    ~Winsock() { WSACleanup(); }
    Winsock(const Winsock&) = delete;
    Winsock& operator=(const Winsock&) = delete;
};

struct Socket {
    SOCKET fd;
    explicit Socket(SOCKET value) : fd(value) {
        if (fd == INVALID_SOCKET) throw std::runtime_error("socket creation failed: " + std::to_string(WSAGetLastError()));
    }
    ~Socket() { if (fd != INVALID_SOCKET) closesocket(fd); }
    Socket(const Socket&) = delete;
    Socket& operator=(const Socket&) = delete;
};

void check(int result, const char* operation) {
    if (result == SOCKET_ERROR) throw std::runtime_error(std::string(operation) + " failed: " + std::to_string(WSAGetLastError()));
}

sockaddr_in loopback(std::uint16_t port) {
    sockaddr_in address{};
    address.sin_family = AF_INET;
    address.sin_port = htons(port);
    address.sin_addr.s_addr = htonl(INADDR_LOOPBACK);
    return address;
}

void configure_socket(SOCKET fd) {
    const DWORD milliseconds = 5000;
    check(setsockopt(fd, SOL_SOCKET, SO_RCVTIMEO, reinterpret_cast<const char*>(&milliseconds), sizeof milliseconds), "receive timeout");
    check(setsockopt(fd, SOL_SOCKET, SO_SNDTIMEO, reinterpret_cast<const char*>(&milliseconds), sizeof milliseconds), "send timeout");
}

void exclusive_bind(SOCKET fd) {
    const BOOL enabled = TRUE;
    check(setsockopt(fd, SOL_SOCKET, SO_EXCLUSIVEADDRUSE, reinterpret_cast<const char*>(&enabled), sizeof enabled), "exclusive address");
}

bool timed_out() {
    const int error = WSAGetLastError();
    return error == WSAETIMEDOUT || error == WSAEWOULDBLOCK;
}

void send_all(SOCKET fd, const char* data, std::size_t size) {
    while (size) {
        const int count = send(fd, data, static_cast<int>(size), 0);
        if (count == SOCKET_ERROR && WSAGetLastError() == WSAEINTR) continue;
        if (count == SOCKET_ERROR && timed_out()) throw std::runtime_error("TCP send timed out");
        if (count <= 0) throw std::runtime_error("TCP send failed: " + std::to_string(WSAGetLastError()));
        data += count;
        size -= static_cast<std::size_t>(count);
    }
}

void wait_readable(SOCKET fd, Clock::time_point deadline) {
    for (;;) {
        const auto remaining = std::chrono::duration_cast<std::chrono::microseconds>(deadline - Clock::now());
        if (remaining.count() <= 0) throw std::runtime_error("TCP receive timed out");
        timeval duration{static_cast<long>(remaining.count() / 1000000),
                         static_cast<long>(remaining.count() % 1000000)};
        fd_set readable;
        FD_ZERO(&readable);
        FD_SET(fd, &readable);
        const int ready = select(0, &readable, nullptr, nullptr, &duration);
        if (ready > 0) return;
        if (ready == 0) throw std::runtime_error("TCP receive timed out");
        if (WSAGetLastError() != WSAEINTR) check(ready, "select");
    }
}

void recv_exact(SOCKET fd, char* data, std::size_t size, Clock::time_point deadline) {
    while (size) {
        wait_readable(fd, deadline);
        const int count = recv(fd, data, static_cast<int>(size), 0);
        if (count == SOCKET_ERROR && WSAGetLastError() == WSAEINTR) continue;
        if (count == 0) throw std::runtime_error("TCP connection closed before full frame");
        if (count == SOCKET_ERROR && timed_out()) throw std::runtime_error("TCP receive timed out");
        if (count == SOCKET_ERROR) throw std::runtime_error("TCP receive failed: " + std::to_string(WSAGetLastError()));
        data += count;
        size -= static_cast<std::size_t>(count);
    }
}

void send_frame(SOCKET fd, std::string_view message) {
    if (message.size() > max_message) throw std::runtime_error("message exceeds 4096 bytes");
    const std::uint32_t length = htonl(static_cast<std::uint32_t>(message.size()));
    send_all(fd, reinterpret_cast<const char*>(&length), sizeof length);
    send_all(fd, message.data(), message.size());
}

std::string recv_frame(SOCKET fd) {
    const auto deadline = Clock::now() + std::chrono::seconds(5);
    std::uint32_t length{};
    recv_exact(fd, reinterpret_cast<char*>(&length), sizeof length, deadline);
    const auto size = ntohl(length);
    if (size > max_message) throw std::runtime_error("frame exceeds 4096 bytes");
    std::string message(size, '\0');
    recv_exact(fd, message.data(), size, deadline);
    return message;
}

SOCKET accept_one(SOCKET listener) {
    fd_set pending;
    FD_ZERO(&pending);
    FD_SET(listener, &pending);
    timeval duration{5, 0};
    const int ready = select(0, &pending, nullptr, nullptr, &duration);
    if (ready == 0) throw std::runtime_error("TCP accept timed out");
    check(ready, "select");
    const SOCKET peer = accept(listener, nullptr, nullptr);
    if (peer == INVALID_SOCKET) throw std::runtime_error("TCP accept failed: " + std::to_string(WSAGetLastError()));
    return peer;
}

void tcp_server() {
    Socket listener(socket(AF_INET, SOCK_STREAM, IPPROTO_TCP));
    configure_socket(listener.fd);
    exclusive_bind(listener.fd);
    const auto address = loopback(tcp_port);
    check(bind(listener.fd, reinterpret_cast<const sockaddr*>(&address), sizeof address), "bind");
    check(listen(listener.fd, 1), "listen");
    std::cout << "TCP listening on 127.0.0.1:" << tcp_port << std::endl;
    Socket peer(accept_one(listener.fd));
    configure_socket(peer.fd);
    send_frame(peer.fd, recv_frame(peer.fd));
}

void tcp_client(std::string_view message) {
    if (message.size() > max_message) throw std::runtime_error("message exceeds 4096 bytes");
    Socket peer(socket(AF_INET, SOCK_STREAM, IPPROTO_TCP));
    configure_socket(peer.fd);
    const auto address = loopback(tcp_port);
    check(connect(peer.fd, reinterpret_cast<const sockaddr*>(&address), sizeof address), "connect");
    send_frame(peer.fd, message);
    std::cout << recv_frame(peer.fd) << '\n';
}

void udp_server() {
    Socket server(socket(AF_INET, SOCK_DGRAM, IPPROTO_UDP));
    configure_socket(server.fd);
    exclusive_bind(server.fd);
    const auto address = loopback(udp_port);
    check(bind(server.fd, reinterpret_cast<const sockaddr*>(&address), sizeof address), "bind");
    std::cout << "UDP listening on 127.0.0.1:" << udp_port << std::endl;
    char buffer[max_message + 1];
    sockaddr_in sender{};
    int sender_size = sizeof sender;
    int count;
    do {
        count = recvfrom(server.fd, buffer, sizeof buffer, 0,
                         reinterpret_cast<sockaddr*>(&sender), &sender_size);
    } while (count == SOCKET_ERROR && WSAGetLastError() == WSAEINTR);
    if (count == SOCKET_ERROR && WSAGetLastError() == WSAEMSGSIZE) throw std::runtime_error("datagram exceeds 4096 bytes");
    if (count == SOCKET_ERROR && timed_out()) throw std::runtime_error("UDP receive timed out");
    if (count == SOCKET_ERROR) throw std::runtime_error("UDP receive failed: " + std::to_string(WSAGetLastError()));
    if (count > static_cast<int>(max_message)) throw std::runtime_error("datagram exceeds 4096 bytes");
    const int sent = sendto(server.fd, buffer, count, 0, reinterpret_cast<const sockaddr*>(&sender), sender_size);
    if (sent != count) throw std::runtime_error("UDP echo failed: " + std::to_string(WSAGetLastError()));
}

void udp_client(std::string_view message) {
    if (message.size() > max_message) throw std::runtime_error("message exceeds 4096 bytes");
    Socket peer(socket(AF_INET, SOCK_DGRAM, IPPROTO_UDP));
    configure_socket(peer.fd);
    const auto address = loopback(udp_port);
    check(connect(peer.fd, reinterpret_cast<const sockaddr*>(&address), sizeof address), "connect");
    const int sent = send(peer.fd, message.data(), static_cast<int>(message.size()), 0);
    if (sent != static_cast<int>(message.size())) throw std::runtime_error("UDP send failed: " + std::to_string(WSAGetLastError()));
    char buffer[max_message + 1];
    int count;
    do { count = recv(peer.fd, buffer, sizeof buffer, 0); }
    while (count == SOCKET_ERROR && WSAGetLastError() == WSAEINTR);
    if (count == SOCKET_ERROR && WSAGetLastError() == WSAEMSGSIZE) throw std::runtime_error("reply exceeds 4096 bytes");
    if (count == SOCKET_ERROR && timed_out()) throw std::runtime_error("UDP receive timed out");
    if (count == SOCKET_ERROR) throw std::runtime_error("UDP receive failed: " + std::to_string(WSAGetLastError()));
    if (count > static_cast<int>(max_message)) throw std::runtime_error("reply exceeds 4096 bytes");
    std::cout.write(buffer, count);
    std::cout << '\n';
}
} // namespace

int main(int argc, char** argv) {
    if (argc < 2 || argc > 3) {
        std::cerr << "usage: socket_lab_windows tcp-server|tcp-client|udp-server|udp-client [message]\n";
        return 2;
    }
    try {
        Winsock winsock;
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
