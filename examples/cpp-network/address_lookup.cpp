#ifdef _WIN32
#include <winsock2.h>
#include <ws2tcpip.h>
#else
#include <arpa/inet.h>
#include <netdb.h>
#include <sys/socket.h>
#endif

#include <iostream>
#include <memory>
#include <string_view>

namespace {
struct SocketRuntime {
    bool ready = true;
    SocketRuntime() {
#ifdef _WIN32
        WSADATA data{};
        ready = WSAStartup(MAKEWORD(2, 2), &data) == 0;
#endif
    }
    ~SocketRuntime() {
#ifdef _WIN32
        if (ready) WSACleanup();
#endif
    }
    SocketRuntime(const SocketRuntime&) = delete;
    SocketRuntime& operator=(const SocketRuntime&) = delete;
};
} // namespace

int main(int argc, char* argv[]) {
    const bool numeric = argc > 1 && std::string_view(argv[1]) == "--numeric";
    if ((!numeric && argc != 1 && argc != 3) || (numeric && argc != 4)) {
        std::cerr << "usage: address_lookup [--numeric] [host service]\n";
        return 2;
    }
    const char* host = argc == 1 ? "localhost" : argv[numeric ? 2 : 1];
    const char* service = argc == 1 ? "40404" : argv[numeric ? 3 : 2];

    SocketRuntime runtime;
    if (!runtime.ready) {
        std::cerr << "socket initialization failed\n";
        return 1;
    }

    addrinfo hints{};
    hints.ai_family = AF_UNSPEC;
    hints.ai_socktype = SOCK_STREAM;
    hints.ai_protocol = IPPROTO_TCP;
    hints.ai_flags = AI_NUMERICSERV | (numeric ? AI_NUMERICHOST : 0);
    addrinfo* raw = nullptr;
    const int status = getaddrinfo(host, service, &hints, &raw);
    if (status != 0) {
        std::cerr << "address lookup failed: " << status << '\n';
        return 1;
    }
    const std::unique_ptr<addrinfo, decltype(&freeaddrinfo)> results(raw, freeaddrinfo);
    bool printed = false;
    for (const addrinfo* entry = results.get(); entry != nullptr; entry = entry->ai_next) {
        const void* address = nullptr;
        unsigned short port = 0;
        const char* family = nullptr;
        if (entry->ai_family == AF_INET) {
            const auto* ipv4 = reinterpret_cast<const sockaddr_in*>(entry->ai_addr);
            address = &ipv4->sin_addr;
            port = ntohs(ipv4->sin_port);
            family = "IPv4";
        } else if (entry->ai_family == AF_INET6) {
            const auto* ipv6 = reinterpret_cast<const sockaddr_in6*>(entry->ai_addr);
            address = &ipv6->sin6_addr;
            port = ntohs(ipv6->sin6_port);
            family = "IPv6";
        } else {
            continue;
        }
        char buffer[INET6_ADDRSTRLEN]{};
        if (inet_ntop(entry->ai_family, address, buffer, sizeof(buffer)) == nullptr) {
            std::cerr << "address formatting failed\n";
            return 1;
        }
        std::cout << family << ' ';
        if (entry->ai_family == AF_INET6) std::cout << '[';
        std::cout << buffer;
        if (entry->ai_family == AF_INET6) std::cout << ']';
        std::cout << ':' << port << '\n';
        printed = true;
    }
    return printed ? 0 : 1;
}
