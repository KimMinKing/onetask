# TLS 인증 TCP 서버 첫 구현

이 프로젝트는 기존 `socket_lab`과 분리된 **Linux/POSIX 전용** 실습 서버입니다. TLS 1.3과 토큰 인증을 통과한 요청 하나를 받아 최대 4096바이트를 에코합니다. 주소는 `127.0.0.1`로 고정되어 외부 네트워크에 바인딩할 수 없습니다.

## 빌드와 검사

OpenSSL 3 개발 헤더·라이브러리, C++20 컴파일러, CMake 3.20+, Python 3 및 `openssl` 명령이 필요합니다. Ubuntu에서는 `libssl-dev`, `g++`, `cmake`, `python3`, `openssl`을 설치합니다.

```sh
cmake -S . -B build
cmake --build build
ctest --test-dir build --output-on-failure
```

통합 검사는 임시 디렉터리에 하루짜리 자체 서명 인증서와 개인키를 생성한 뒤 정상 에코, 동시 접속, 연결 상한, 잘못된 토큰·프레임·인증서, TLS 1.2 거부, 느린 요청, 종료를 확인합니다. 임시 인증서를 운영에 사용하지 마세요.

## 로컬 실행

아래 인증서는 로컬 실습용입니다. 클라이언트는 인증서를 신뢰 저장소로 명시하고 호스트 이름 `localhost`를 검증합니다.

```sh
openssl req -x509 -newkey rsa:2048 -nodes -days 1 \
  -subj /CN=localhost -addext subjectAltName=DNS:localhost,IP:127.0.0.1 \
  -keyout demo-key.pem -out demo-cert.pem
chmod 600 demo-key.pem
export ONETASK_LAB_TOKEN="$(openssl rand -hex 32)"
./build/secure_server demo-cert.pem demo-key.pem 40406
```

다른 터미널에서 같은 토큰을 안전하게 전달한 뒤 다음 예시를 실행합니다.

```sh
python3 - <<'PY'
import os, socket, ssl, struct
token = os.environ['ONETASK_LAB_TOKEN'].encode()
context = ssl.create_default_context(cafile='demo-cert.pem')
with socket.create_connection(('127.0.0.1', 40406), timeout=3) as raw:
    with context.wrap_socket(raw, server_hostname='localhost') as peer:
        message = b'hello over TLS'
        peer.sendall(struct.pack('!H', len(token)) + token + struct.pack('!I', len(message)) + message)
        stream = peer.makefile('rb')
        length = struct.unpack('!I', stream.read(4))[0]
        print(stream.read(length).decode())
PY
```

프로토콜은 `토큰 길이(2바이트) → 토큰(최대 256바이트) → 본문 길이(4바이트) → 본문(최대 4096바이트)` 순서이며 모든 정수는 네트워크 바이트 순서입니다. 서버가 보내는 응답은 본문 길이와 본문입니다. 토큰 길이는 32~256바이트여야 합니다.

## 현재 보장 범위와 남은 작업

- 서버는 TLS 1.3만 받고 인증서·개인키 짝과 개인키 파일 권한을 시작할 때 검증합니다. 토큰은 환경 변수에서 읽고 내용은 로그에 남기지 않습니다. 인증은 TLS 완료 후, 본문 길이·본문을 읽기 전에 수행합니다.
- 작업자 4개와 대기열 4개로 한 번에 최대 8개 연결만 받습니다. 초과 접속은 닫습니다. 접속 수락 시점부터 대기열·TLS 핸드셰이크·응답 쓰기까지 연결당 단조 시계 기준 5초를 적용합니다.
- 운영용 토큰 발급·만료·폐기, 사용자별 권한과 요청률 제한, 인증서 무중단 교체, 관측 지표, 배포 도메인·방화벽·외부 바인딩은 아직 구현되지 않았습니다. 환경 변수는 같은 머신의 권한 있는 프로세스에 노출될 수 있으므로 운영용 비밀 저장 방식도 별도로 정해야 합니다.
- UDP는 이 TLS 서버에 포함되지 않습니다. 외부 UDP 서비스에는 별도의 DTLS/QUIC 설계와 인증·재전송·증폭 방지가 필요합니다.

근거: [OpenSSL 비차단 핸드셰이크](https://docs.openssl.org/3.0/man3/SSL_accept/), [TLS 버전 설정](https://docs.openssl.org/3.0/man3/SSL_CTX_set_min_proto_version/), [인증서·키 검사](https://docs.openssl.org/master/man3/SSL_CTX_use_PrivateKey_file/).
