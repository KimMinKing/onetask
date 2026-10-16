# C++ TCP/UDP loopback lab

## IPv4/IPv6 주소 조회

`address_lookup`은 `getaddrinfo`로 TCP 주소 후보를 찾고 `inet_ntop`으로 주소를 출력합니다. `--numeric`은 외부 DNS 조회 없이 숫자 주소만 허용합니다. 조회 결과는 `freeaddrinfo`로 해제하며, Windows에서는 Winsock을 초기화하고 정리합니다. 이 도구는 실제 TCP 연결을 열지 않습니다.

```sh
cmake -S . -B build
cmake --build build --config Release
ctest --test-dir build -C Release --output-on-failure
./build/address_lookup --numeric 127.0.0.1 40404
./build/address_lookup --numeric ::1 40404
```

Visual Studio 다중 구성 빌드의 실행 파일은 `build/Release/address_lookup.exe`에 있습니다. `address_lookup localhost 40404`는 시스템의 호스트 설정에 따라 IPv4와 IPv6 중 하나 이상을 출력합니다. 통합 검사는 숫자 루프백 주소만 사용하므로 DNS나 외부 네트워크에 의존하지 않습니다.

참고: [POSIX getaddrinfo](https://pubs.opengroup.org/onlinepubs/9799919799/functions/getaddrinfo.html), [Windows getaddrinfo](https://learn.microsoft.com/en-us/windows/win32/api/ws2tcpip/nf-ws2tcpip-getaddrinfo), [Windows inet_ntop](https://learn.microsoft.com/en-us/windows/win32/api/ws2tcpip/nf-ws2tcpip-inet_ntop).

Linux/WSL의 POSIX 예제와 Windows의 Winsock 예제를 제공합니다. 외부 네트워크에 노출하지 않도록 `127.0.0.1`에만 바인딩하고, TCP `40404`와 UDP `40405` 포트를 사용합니다. 서버는 요청 한 건을 처리하고 종료합니다.

Linux/WSL:

```sh
g++ -std=c++20 -Wall -Wextra -Wpedantic -O2 socket_lab.cpp -o socket_lab
./socket_lab tcp-server                     # 터미널 1
./socket_lab tcp-client 'hello over TCP'    # 터미널 2
./socket_lab udp-server                     # 터미널 1
./socket_lab udp-client 'hello over UDP'    # 터미널 2
python3 test_socket_lab.py                   # GCC 경고·ASan/UBSan·실패 경로 검사
```

Windows (MinGW-w64, PowerShell):

```powershell
g++ -std=c++20 -Wall -Wextra -Wpedantic -Werror socket_lab_windows.cpp -o socket_lab_windows.exe -lws2_32
./socket_lab_windows.exe tcp-server          # 터미널 1
./socket_lab_windows.exe tcp-client hello    # 터미널 2
./socket_lab_windows.exe udp-server          # 터미널 1
./socket_lab_windows.exe udp-client hello    # 터미널 2
python test_socket_lab.py                    # Windows 13개 검사 + POSIX 전용 1개 검사
```

CMake를 사용하는 경우 아래 명령으로 플랫폼에 맞는 예제를 빌드하고 동일한 검사를 실행할 수 있습니다. Windows에서는 MinGW-w64 또는 MSVC C++ 도구 모음을 선택합니다.

```sh
cmake -S . -B build
cmake --build build
ctest --test-dir build --output-on-failure
```

GitHub Actions는 Linux GCC와 Windows MSVC에서 같은 CMake 빌드·통합 검사를 실행하도록 설정했습니다. 로컬에서는 Windows MinGW-w64 CMake/CTest 경로를 확인했습니다.

앱의 `/cpp/lab`에서 전체 프로젝트 ZIP과 플랫폼별 소스를 내려받을 수 있습니다. 예제 코드를 수정한 뒤에는 저장소 루트에서 `python examples/cpp-network/sync_public.py`를 실행해 다운로드 파일을 갱신합니다. CI는 `--check`로 원본과 배포 파일의 일치를 확인합니다.

TCP 예제는 4바이트 네트워크 바이트 순서 길이와 최대 4096바이트 본문을 `send_all`/`recv_exact`로 전송합니다. TCP는 바이트 스트림이므로 `recv` 한 번으로 완전한 메시지가 도착한다고 가정하지 않습니다. UDP 예제는 데이터그램 하나를 그대로 되돌려 주며, 최대 길이를 초과한 데이터그램을 거부합니다. 5초 연결 수락·송수신 타임아웃은 학습 중 무한 대기를 막기 위한 값입니다. UDP 재전송·중복 제거·순서 보장은 이 예제에 포함되지 않습니다.

TCP 프레임 수신은 헤더와 본문 전체에 단조 시계 기준 5초 마감 시간을 공유합니다. 상대가 몇 초마다 한 바이트씩 보내도 수신 시간이 무제한 연장되지 않습니다. 연결·전송·UDP는 별도 호출별 제한이므로 전체 요청 시간과 여러 연결을 보장하는 운영용 서버로 사용하지 마세요.

POSIX 수신 대기는 높은 파일 디스크립터 번호에도 동작하는 `poll`을 사용합니다. Linux 통합 검사에서는 1023보다 큰 번호로 열린 소켓에서도 TCP 에코가 되는지 확인합니다. Windows는 Winsock `select` 경로를 사용합니다.

Windows 예제는 `WSAStartup`/`closesocket`, 밀리초 단위 소켓 타임아웃, `select` 기반 연결 대기, `SO_EXCLUSIVEADDRUSE`, `WSAEMSGSIZE` 처리를 사용합니다. 외부 서비스를 만들 때 필요한 TLS·인증·다중 연결 설계는 [PRODUCTION_DESIGN.md](PRODUCTION_DESIGN.md)에 정리했습니다.

참고: [TCP RFC 9293](https://www.rfc-editor.org/rfc/rfc9293.html), [UDP RFC 768](https://www.rfc-editor.org/rfc/rfc768.html), [POSIX recv](https://pubs.opengroup.org/onlinepubs/9799919799/functions/recv.html), [Windows 주소 독점 설정](https://learn.microsoft.com/en-us/windows/win32/winsock/using-so-reuseaddr-and-so-exclusiveaddruse), [Winsock recvfrom](https://learn.microsoft.com/en-us/windows/win32/api/winsock/nf-winsock-recvfrom).
