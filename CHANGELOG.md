# CHANGELOG — onetask

## 2026-10-20
### 완료
- HSK 4급 예문·병음 교정 목록 601개를 다시 검사해 예문에 목표 단어가 없는 항목, 예문과 병음의 음절 순서 불일치, 중복 예문이 모두 0개임을 확인했다. 서버 DB 전체 601개와 교정 목록을 읽기 전용으로 비교하는 명령을 추가해, 배포 미반영·단어 ID 불일치·적용 기록만 남은 상태를 구분할 수 있게 했다. 기존 V1 적용 기록이 있어도 단어 식별자가 모두 맞으면 교정 목록을 한 번 더 적용하는 V2 마이그레이션을 추가했다.
- 이야기형 5과목(영어·Rust·C++·SQLD·네트워크)을 `이야기 → 실제 개념 → 직접 확인`의 짧은 화면으로 나눴다. 단계 안에서는 세 화면을 다시 오갈 수 있고, 쉬기·다시 시작·오늘은 여기까지 동선을 추가했다.
- 현재 과목·단계·화면과 입력 중인 답을 사용자별 브라우저 저장소에 자동 저장한다. 학습 선택 화면에서 최근 단계로 바로 이어 가며, 과목의 마지막 단계를 완료하면 이어하기 기록을 지운다. 손상된 저장 데이터는 무시하고 새 단계로 안전하게 시작한다.
- 저장·복원·사용자 분리·손상 데이터 회귀 검사 2개와 기존 이야기 구성 검사 7개·영어 회상 검사 2개, 프런트엔드 린트와 프로덕션 빌드가 통과했다.
- 첫 화면의 개별 학습 바로가기를 `학습하기` 하나로 모았다. 새 학습 선택 화면에서 기존 13개 학습·복습·통계 경로를 과목별로 찾을 수 있고, Rust·영어·C++·SQLD·네트워크에서는 선택 화면으로 돌아갈 수 있다. 기존 과목 경로와 진도 데이터는 유지한다.
- 서로 독립된 이야기의 주인공을 영어 하린, Rust 서윤, SQLD 지안, 네트워크 도윤, C++ 민재로 구분했다. 영어 이야기에서 Rust 여정과 등장인물로 직접 연결되던 문장을 정리했다.
- C++ 26단계 전체를 민재의 해안 통신소 복구 이야기로 연결했다. 앞 단계의 포인터·자원·버퍼 실수가 동시성·TCP/UDP·보안 문제로 이어지며, 장마다 실제 C++ 개념과 가상 장면의 차이를 설명한다.
- 학습 경로·이야기 검사 7개, 영어 회상 검사 2개, 프런트엔드 린트와 프로덕션 빌드가 통과했다.
- SQLD 100단계를 기록학교의 졸업 장부 복구 이야기로, 네트워크·TCP/UDP 120단계를 폭풍 뒤 운무학당 통신망 복구 이야기로 엮었다. 각 단계에 앞 사건의 결과가 이어지는 고유 장면과 실제 개념 연결을 넣고, 장 전환에서는 다음 문제의 배경과 학습 순서를 길게 설명한다. 가상 사건과 실제 SQL·프로토콜 규칙을 구별해 표시한다.
- 네트워크 기본 100문제의 반복 안내를 없애고 두 보기 문제를 정답 위치가 섞인 4지선다로 바꿨다. 진도 저장은 서버 성공 후에만 반영·이동하며, 오류와 시간 초과에는 답을 유지한 채 재시도할 수 있다. 기록 시간도 고정 15분 대신 실제 단계 경과 시간으로 보낸다.
- 두 이야기의 220단계 누락·장 구간·중복 장면과 SQLD/네트워크 문제의 보기 수·중복·정답 위치를 회귀 검사했다. 이야기 검사 4개, 프런트엔드 린트와 프로덕션 빌드가 통과했다.
- HSK 4급 601개 단어의 뜻·중국어 예문·한국어 예문·예문 병음을 원본 문장 기준으로 다시 짝지었다. `厉害`의 `说得`·`厉害`·`一样` 병음을 직접 교정하고, `扩大`·`冷静`·`以`·`座`·`而` 등 잘못 연결되거나 뜻이 틀린 항목을 정리했다. HSK 3·5급의 목표 단어가 예문에 없는 10개도 수정했다. 시작 시 단어 식별자가 맞는 DB에 한 번만 적용하는 마이그레이션과 회귀 검사를 추가했다.
- Rust 기초부터 소유권·오류·도구·스레드·TCP/UDP·작은 서버까지 54단계를 추가했다. 서윤의 결계 수리 사건이 전 단계에 걸쳐 이어지고, 매 단계에 가상 장면과 실제 개념의 연결, 코드 실습, 자기 설명을 넣었다.
- 하린의 교역문 이야기로 영어 완전 기초 25장을 추가했다. 주어·동사 순서에서 질문·시제·조언까지 이어지며, 장마다 새 단어 6개와 여러 이전 장 단어를 뜻만 보고 입력하고 틀리면 다시 쓰도록 했다. 영어 카드 복습도 뜻에서 철자를 회상하도록 바꾸고 하루 추천 복습을 A1로 낮췄다.
- Rust 54단계와 영어 25장 **모두**에 이야기 다음의 초보자용 긴 풀이와 다른 예·헷갈리는 부분을 추가했다. Rust의 표현식·변수·소유권·Option/Result·이터레이터·TCP 등 9곳에는 Python 코드와 Rust 코드를 나란히 보여 주고 두 언어의 규칙이 달라지는 지점도 설명한다. 영어 초반 질문 예문과 `want to` 단어 설명도 기초 문법에 맞게 다듬었다.
- 백엔드 검사 39개·하위 검사 3개, 프런트엔드 린트·프로덕션 빌드·영어 회상 검사 2개·이야기 구성 검사 2개를 통과했다.

### 변경된 파일
- `backend/hsk4_pair_audit.py`, `backend/word_pair_migration.py`, `backend/tests/test_hsk4_word_pairs.py`, `backend/WORD_PAIRS.md`, `DEPLOYMENT.md` — HSK 4급 전체 DB 적용 여부 점검, V1 기록이 남은 DB의 V2 복구, 서버 배포 절차 안내.
- `frontend/src/lib/studyCheckpoint.ts`, `frontend/src/lib/useStudyFlow.ts`, `frontend/src/components/StudyFlowBar.tsx`, `frontend/src/app/learn/page.tsx` — 최근 학습 이어하기, 사용자별 자동 저장, 짧은 장면과 쉬기 화면.
- `frontend/src/app/english-basics/page.tsx`, `frontend/src/app/rust/page.tsx`, `frontend/src/app/cpp/page.tsx`, `frontend/src/app/sqld/page.tsx`, `frontend/src/app/network/page.tsx` — 과목별 세 화면과 답안 복원.
- `frontend/tests/studyCheckpoint.test.mjs`, `frontend/package.json` — 체크포인트 회귀 검사.
- `frontend/src/app/page.tsx`, `frontend/src/app/learn/page.tsx` — 첫 화면 학습 링크 정리와 과목 선택 화면.
- `frontend/src/app/english-basics/`, `frontend/src/app/sqld/story.ts`, `frontend/src/app/network/story.ts` — 독립된 이야기의 주인공·설정 정리.
- `frontend/src/app/cpp/story.ts`, `frontend/src/app/cpp/page.tsx`, `frontend/src/app/rust/page.tsx`, `frontend/src/app/sqld/page.tsx`, `frontend/src/app/network/page.tsx`, `frontend/tests/storyCurriculum.test.mjs` — C++ 이야기 연결, 학습 선택 복귀, 구성 검사.
- `frontend/src/app/sqld/story.ts`, `frontend/src/app/sqld/page.tsx`, `frontend/src/app/network/story.ts`, `frontend/src/app/network/curriculum.ts`, `frontend/src/app/network/page.tsx`, `frontend/tests/storyCurriculum.test.mjs` — SQLD·네트워크 연결형 이야기와 실제 개념 안내, 네트워크 문제·저장 흐름 개선.
- `backend/build_hsk4_pair_catalog.py`, `backend/data/hsk4_word_pairs.json`, `backend/word_pair_migration.py`, `backend/migrate.py`, `backend/WORD_PAIRS.md`, `backend/tests/test_hsk4_word_pairs.py` — 중국어 예문 복구, 배포 시 적용, 남은 이미지 점검 범위.
- `frontend/src/app/rust/`, `frontend/src/app/english-basics/`, `frontend/src/components/StudyProse.tsx`, `frontend/src/app/words/page.tsx`, `frontend/src/lib/englishRecall.ts`, `frontend/tests/englishRecall.test.mjs`, `frontend/tests/storyCurriculum.test.mjs` — 연결된 이야기, 단계별 부연 풀이, Python 비교와 단어 회상.
- `backend/learning_service.py`, `backend/routers/learning.py`, `backend/routers/settings.py`, `backend/tests/test_learning_service.py`, `frontend/src/app/page.tsx`, `frontend/src/app/settings/page.tsx`, `frontend/package.json` — 신규 과목 진도·하루 추천·이동 경로.

### 다음 세션
- 운영 DB에 마이그레이션을 적용하고 `厉害`·`扩大`·HSK 3·5급 수정 항목을 실제 카드 화면에서 확인한다. 수정 후 지문이 맞지 않는 HSK 4급 이미지 121개와 HSK 3·5급 이미지 10개는 검토·재생성한다. HSK 6급의 빈 예문 2,500개는 신뢰할 수 있는 자료를 마련해 별도로 작성한다.
- Rust 예제를 실제 Cargo 프로젝트에서 단계별로 실행하고, 영어 25장 학습 흐름을 실제 모바일 화면에서 점검한다.

## 2026-10-18
### 완료
- 오늘의 5·15·30·60분 학습 계획에 중국어 HSK 4급과 영어 B1 단어 복습을 모두 배정했다. 선택한 집중 과목과 중복되면 하나의 과제로 합치고, 전체 시간이 선택한 시간과 일치하도록 조정했다.
- 영어 과제를 영어 B1 단어 화면에 연결하고, 해당 수준의 단어를 오늘 복습했을 때만 완료로 표시한다. 중국어 과제도 HSK 4급 복습만 완료로 인정한다.
- 2·3·4·7·8분 등 분할된 학습 과제에서도 타이머가 표시되도록 수정했다.
- 백엔드 전체 검사 35개와 프런트엔드 린트·프로덕션 빌드를 통과했다.

### 변경된 파일
- `backend/learning_service.py`, `backend/tests/test_learning_service.py`, `backend/tests/test_cpp_http.py` — 학습 계획·완료 판정 및 검사.
- `frontend/src/app/words/page.tsx`, `frontend/src/components/StudyTimer.tsx` — 영어 단어 바로가기와 분할 과제 타이머.

### 다음 세션
- 실제 배포 후 5분·15분 계획에서 두 언어 과제 이동과 완료 표시를 계정 데이터로 확인한다.

## 2026-10-17
### 완료
- SQLD에서 첫 단계 저장 후 다음 단계의 `저장 중` 상태가 계속 남던 문제를 수정했다. 서버 저장 성공 후에만 완료·다음 단계로 이동하며, 실패 또는 15초 시간 초과 시 오류를 표시하고 재시도할 수 있다. 학습 기록에는 고정 15분 대신 해당 단계에서 실제 경과한 분을 보낸다.
- SQLD 100단계의 동일한 안내 문장을 제거하고, 확인 문제를 정답 위치가 단계마다 다른 4지선다로 변경했다.
- 추천 학습에서 들어간 페이지에 목표 시간과 남은 시간을 표시한다. 시간이 끝나도 자동 이동하지 않는다는 안내를 함께 표시한다.
- HSK4의 수정 전·후 예문을 대조해 밀린 이미지 466개를 포함한 기존 이미지 4,664개의 연결을 검증했다. 확인 불가능한 HSK4 그림 35개와 예문 이력이 다른 HSK3 그림 1개는 숨기고, 향후 생성 이미지는 단어 내용 지문을 파일명에 넣어 데이터 수정 후 잘못된 그림이 재사용되지 않도록 했다. 이미지 URL 버전도 추가했다.
- 백엔드 전체 검사 30개·하위 검사 3개, 프런트엔드 린트·오디오 검사 7개·프로덕션 빌드, 백엔드 Docker 이미지 빌드를 통과했다. SQLD 문제 100개의 보기 수·중복·정답 위치를 점검했다.

### 변경된 파일
- `frontend/src/app/sqld/` — 진도 저장 상태·문제 구성·반복 안내 수정.
- `frontend/src/components/StudyTimer.tsx`, `frontend/src/components/TodayStudy.tsx`, `frontend/src/app/layout.tsx` — 추천 학습 시간 표시.
- `backend/word_images.py`, `backend/word_image_manifest.json`, `backend/routers/words.py`, `backend/gen_hsk*_images.py`, `backend/regen_missing_images.py`, `backend/audit_word_images.py` — 이미지 연결 검증과 재생성 경로.
- `backend/WORD_IMAGES.md`, `backend/tests/test_word_images.py` — 운영 점검 방법과 회귀 검사.

### 다음 세션
- 실제 운영 DB에서 `audit_word_images.py` 결과를 확인하고 숨겨진 이미지를 검토한다. 원본 대응이 불가능한 그림은 비용 확인 후 재생성한다.

## 2026-10-16
### 완료
- 누적된 보안·계정 분리·학습·C++ TCP/UDP 및 TLS 서버 변경을 푸시하기 전 점검했다. 생성된 테스트 SQLite 파일은 Git 추적에서 제외하고, 과거 SQL 덤프 두 파일의 추적 제거를 유지했다.
- Linux CMake/CTest에서 C++ 학습 예제와 TLS 서버 통합 검사, Python 3.11 컨테이너에서 백엔드 검사 28개·하위 검사 3개, 프런트엔드 린트·오디오 검사 7개·프로덕션 빌드가 통과했다.

### 변경된 파일
- `.gitignore` — 테스트용 `.sqlite` 파일의 실수 커밋 방지.
- `CHANGELOG.md` — 이번 검토와 검증 기록.

### 다음 세션
- 원격 CI 결과 확인, 실제 브라우저 동작 검증, 운영용 토큰 수명·인증서 교체·요청률 제한 구현.

## 2026-10-15
### 완료
- 기존 TCP/UDP 학습 예제와 분리된 Linux `secure-server` 첫 구현을 추가했다. TLS 1.3, 개인키 파일 권한·인증서 짝 검사, 본문 수신 전 토큰 인증, 최대 4096바이트 프레임, 작업자 4개·대기열 4개, 수락 시점부터 5초 마감 시간, 루프백 전용 바인딩과 종료 처리를 적용했다.
- 임시 인증서를 사용하는 통합 검사 12개를 추가해 정상·동시 연결, 연결 상한, 인증·인증서·TLS 버전 실패, 과대 프레임, 느린 요청, 종료 경로를 검증했다. Linux GCC 일반 및 ASan/UBSan 빌드에서 모두 통과했다.
- Linux GitHub Actions 작업에 일반·검사기 빌드와 통합 검사를 연결했다. 원격 CI 결과는 아직 확인하지 않았다.

### 변경된 파일
- `examples/cpp-network/secure-server/` — 별도 TLS 서버, CMake 설정, 통합 검사와 실행 안내.
- `.github/workflows/cpp-network.yml` — Linux 서버 빌드·검사 자동화.
- `examples/cpp-network/PRODUCTION_DESIGN.md`, `REVIEW_2026-09-28.md` — 구현 범위와 남은 운영 요건 기록.

### 다음 세션
- 실제 서비스의 인증·토큰 수명, 도메인·인증서 발급, 동시 접속 규모와 배포 환경을 정한 뒤 외부 바인딩·요청률 제한·관측성을 구현한다. Windows와 UDP 보안 경로는 별도 설계·구현한다.

## 2026-10-14
### 완료
- POSIX 높은 파일 디스크립터 회귀 검사와 TCP/UDP 클라이언트의 과대 응답 거부 검사를 포함한 C++ 소켓 통합 검사를 Linux GCC, Windows MSVC·MinGW에서 통과했다. Linux 전체 검사는 연속 두 번 통과했다.
- 가짜 TCP 서버 검사의 POSIX 포트 재사용 설정을 보완해 연속 실행 시 포트 바인딩 충돌을 해결했다.
- 백엔드 테스트 28개와 하위 검사 3개, 프런트엔드 린트·오디오 테스트 7개·프로덕션 빌드를 통과했다. 로컬 HTTP에서 `/cpp/lab`과 ZIP·C++ 소스 3개의 200 응답을 확인했다.

### 변경된 파일
- `examples/cpp-network/test_socket_lab.py` — 과대 응답 검사와 POSIX 테스트 포트 재사용 보완.
- `frontend/public/examples/cpp-network/` — 최종 C++ 소스·검사 다운로드 자산 갱신.
- `REVIEW_2026-09-28.md` — 검증 결과와 남은 운영 작업 정리.

### 다음 세션
- 원격 GitHub Actions 결과와 실제 브라우저 화면·다운로드 동작 확인. Windows Computer Use가 브라우저 URL을 확인하지 못해 이번에는 UI 조작을 중단했다. 운영용 TLS·인증·다중 연결은 학습 예제와 별도 설계·구현이 필요하다.

## 2026-10-05
### 완료
- POSIX TCP 프레임 수신 대기를 `select`에서 `poll`로 변경해 높은 파일 디스크립터 번호에서 `FD_SET`의 정의되지 않은 동작 가능성을 제거했다.
- 높은 디스크립터를 물려준 소켓의 TCP 에코 회귀 검사와 TCP/UDP 클라이언트의 과대 응답 거부 검사를 추가했다.

### 변경된 파일
- `examples/cpp-network/socket_lab.cpp`, `test_socket_lab.py`, `README.md` — 높은 디스크립터 경계 수정·클라이언트 응답 검증·설명.
- `examples/cpp-network/sync_public.py`가 생성하는 다운로드 자산 — 소스와 검사 갱신.
- `REVIEW_2026-09-28.md` — 발견 사항과 남은 작업 기록.

### 다음 세션
- 실제 브라우저 다운로드와 원격 CI 결과 확인. 운영용 전체 요청 마감 시간·TLS·인증·다중 연결은 별도 구현.

## 2026-10-04 — TCP 느린 전송 경계
- Linux/Windows 소켓 실습의 TCP 프레임 헤더와 본문 수신에 하나의 5초 마감 시간을 적용했다. 바이트를 간헐적으로 보내 호출별 타임아웃을 계속 연장하는 경로를 막았다.
- 느린 헤더 및 헤더·본문 공통 마감 시간 통합 검사를 추가했다. Windows MSVC·MinGW와 WSL Ubuntu GCC에서 소켓 검사 11개와 주소 조회 검사 5개가 모두 통과했다.
- 학습용 예제의 연결·전송·UDP 제한은 여전히 호출별이며, 운영 서비스의 전체 요청 마감 시간·TLS·인증·다중 연결 설계는 별도 작업이다.

## 2026-10-03 — IPv4/IPv6 주소 조회 실습
- C++ `getaddrinfo`/`inet_ntop` 기반 주소 조회 예제를 Linux와 Windows 공통으로 추가하고, 숫자 IPv4/IPv6 및 잘못된 주소·서비스 입력을 자동 검사한다. DNS가 필요한 경로는 통합 검사에서 제외했다.
- CMake/CTest, 다운로드 ZIP·단일 소스, `/cpp/lab` 실습 안내에 예제를 연결했다. Windows MSVC·MinGW와 WSL Ubuntu GCC에서 Release/기본 빌드와 기존 소켓·새 주소 조회 통합 검사를 통과했고 프런트엔드 린트·프로덕션 빌드를 확인했다.
- 남은 일: 실제 브라우저에서 다운로드·화면 동작 확인, 원격 GitHub Actions 결과 확인, TLS·인증·다중 연결 서버 설계의 구현은 별도 작업.

---

## 2026-10-03 — C++ 네트워크 예제 빌드·검증 경로
- CMake 빌드를 추가하고 기존 TCP/UDP 통합 검사 9개가 미리 빌드한 실행 파일을 검증할 수 있게 했다. Windows MinGW-w64와 Linux GCC 14 컨테이너에서 CMake/CTest 실행을 확인했다.
- Linux GCC와 Windows MSVC를 대상으로 하는 GitHub Actions 작업을 추가했다. CI 실행 결과는 아직 확인하지 않았다.
- 소켓 예제·검증 경로를 README에 반영했다. 실제 브라우저 진도 동작과 운영용 TLS·다중 연결 구현은 별도 검증·개발 항목으로 남는다.
- 앱에 `/cpp/lab` 실습 페이지를 추가해 전체 프로젝트 ZIP과 Linux·Windows C++ 소스를 내려받고 빌드·TCP/UDP 실행 순서를 볼 수 있게 했다. 줄바꿈·ZIP 압축 바이트 차이에 영향받지 않는 원본/공개 자산 일치 검사를 CI에 연결했다.
- 프런트엔드 린트·프로덕션 빌드가 통과했고, 빌드된 `/cpp/lab`과 ZIP·Linux 소스가 로컬 HTTP에서 200으로 제공되는 것을 확인했다.

## 2026-09-29 — C++·TCP/UDP 학습 확장
- C++ 기초·소유권·RAII·동시성·바이트 순서·TCP/UDP 소켓·TLS까지 이어지는 26단계 코스와 퀴즈, 계정별 진도·오답 연동을 추가했다.
- 네트워크 코스를 100단계에서 120단계로 확장해 TCP 흐름/혼잡 제어, 프레이밍, 부분 송수신, UDP 데이터그램, DNS·MTU·NAT·QUIC·TLS 진단을 다룬다. 기존 1~100단계 진도는 유지한다.
- 홈·오늘의 학습·설정·주간 보고·오답 노트에 C++ 과목을 연결하고, 네트워크 코스의 단계 수 표시와 오늘의 학습 상한을 갱신했다.
- Linux/WSL에서 실행하는 루프백 TCP/UDP 에코 예제를 추가했다. TCP는 길이 프레임과 부분 송수신 루프, UDP는 데이터그램 크기 검증, 양쪽 모두 4096바이트 상한과 송수신 타임아웃을 사용한다.
- TCP 서버 재시작을 위한 주소 재사용 설정과 클라이언트 연결 전 크기 검증을 추가했다. C++ 오프라인 진도는 다음 접속에서 서버에 재전송하며 실패 시 재시도 버튼을 표시한다.
- 학습 진도 API는 SQLD 1~100, 네트워크 1~120, C++ 1~26의 정규 단계 ID만 받도록 검증한다. 이전 로컬 진도 가져오기 요청에는 항목 수와 단계 범위 상한을 적용했다.
- TCP 예제의 연결 수락 및 부분 헤더 대기에도 타임아웃 경로를 확인하고, 연속 실행·잘못된 입력·느린 피어를 포함한 통합 검사 9개를 통과했다.
- 검증: 프런트엔드 ESLint·TypeScript·프로덕션 빌드, 백엔드 전체 테스트 28개와 하위 검사 3개, Linux GCC 14 `-Werror` 및 주소/정의되지 않은 동작 검사 아래 소켓 통합 검사 9개 통과.
- Windows Winsock 루프백 TCP/UDP 예제와 실행 안내를 추가하고, Windows 네이티브·Linux에서 동일한 소켓 통합 검사 9개를 통과했다. 실제 HTTP 경로에서 로그인 쿠키·C++ 설정·진도·오답을 확인하는 백엔드 검사도 추가했다.
- 외부 서비스 확장을 위한 TLS·인증·연결 수·백프레셔·종료 조건을 별도 설계 문서에 정리했다. 운영용 서버 구현은 이 변경에 포함하지 않았다.

## 2026-09-29 — 마이그레이션 검증

- 임시 PostgreSQL 16에서 구형 단어 카드와 Spring 복습 데이터를 생성해 현재 스키마 생성 및 런타임 마이그레이션을 두 번 실행하고, 마스터 계정으로 이전된 값과 재실행 성공을 확인했다.
- Python 3.11 Docker 이미지에서 추출한 `backend/requirements.lock`으로 전이 의존성을 고정하고 백엔드 이미지 설치에 적용했다. 잠금 목록의 알려진 취약점 검사와 Docker 재빌드를 통과했다.
- 중국어·영어·일본어 단어 전체 목록을 서버 검색과 100개 단위 페이지 조회로 변경하고, 화면에 더 보기·검색 재조회·재시도 처리를 연결했다. 각 사전 205개 표본의 마지막 페이지와 전체 검색을 검사했다.
- 백엔드 테스트 24개와 단어 목록 하위 검사 3개, 프런트엔드 린트·타입 검사·프로덕션 빌드 통과.
- DB 준비를 `backend/migrate.py` 명령으로 분리하고 PostgreSQL 세션 잠금으로 동시 실행을 직렬화했다. Docker는 마이그레이션 성공 후 API를 실행하고, 스케줄러는 앱 시작·종료 시점에 맞춰 동작한다.
- 새 PostgreSQL 16 임시 DB에서 마이그레이션 명령을 두 번 실행하고 Docker 이미지의 SQLite 마이그레이션·앱 import를 확인했다.
- Python 3.11 `pip-compile`로 `requirements.lock`에 배포 파일 SHA-256 해시를 추가하고 Docker 설치에 `--require-hashes`를 적용했다. 최종 이미지 빌드·의존성 취약점 재검사·백엔드 테스트를 통과했다.
- 검증에는 운영 DB를 사용하지 않았으며 임시 컨테이너와 검사 스크립트는 종료·삭제했다.

## 2026-09-28 — 점검 후 우선 항목 수정

### 완료
- SQL 덤프 두 파일을 로컬에 보존하면서 Git 추적에서 제외하고 재추적 방지 패턴 추가
- Compose의 DB 호스트 포트 제거, 백엔드 포트를 로컬 바인딩으로 변경하고 내부 API 프록시 주소 사용
- Spring 복습·즐겨찾기를 계정별 카드로 분리하고 기존 값을 마스터 계정으로 이전하는 일회성 마이그레이션 추가
- 공용 단어 삭제·번역 및 이미지 생성 API를 마스터 전용으로 제한하고 푸시 구독 소유권 이전·로그아웃 정리
- 첫 계정 등록 코드, DB 기반 로그인 시도 제한, 쿠키 요청 출처 검사 보강

- 기존 로그인 쿠키가 새 로그인 쿠키를 덮어쓰던 미들웨어 갱신 제거
- 반복 작업 날짜 계산 오류와 달력 반복 일정 표시 수정, 브라우저 학습 진도 계정별 저장

- 반복 작업 컬럼의 모델 배치 수정 및 예정일 전에 완료해도 다음 작업이 같은 날짜로 생성되지 않도록 보정

- 기존 공용 단어 즐겨찾기를 마스터 계정에 한 번만 이전하고 재시작 시 사용자 변경을 보존
- 일정·작업 주요 입력 검증과 보안·계정 격리·반복 일정 회귀 테스트 추가
- Python 직접 의존성 버전 고정, 취약점이 확인된 `python-multipart`를 0.0.32로 갱신, 알림 버튼에서 서비스 워커 등록 및 기존 권한의 구독 재연결
- 백엔드 테스트 23개, 프런트엔드 린트·타입 검사·프로덕션 빌드·음성 테스트 7개 통과
- Python 의존성 취약점 스캔 0건, Python 3.11 백엔드 Docker 빌드·기동 확인 통과

### 변경된 파일
- `.gitignore`, `docker-compose.yml`, `.env.example`, `DEPLOYMENT.md`, `CLAUDE.md` — 데이터·배포 설정과 문서 갱신
- `backend/models.py`, `backend/migrations_runtime.py`, `backend/routers/spring_topics.py`, `backend/requirements.txt` — Spring 계정별 상태와 기존 값 이전, 의존성 버전 고정
- `backend/routers/auth.py`, `backend/main.py`, `backend/csrf_utils.py` — 초기 계정 보호와 인증 요청 제한
- `backend/routers/{words,english_words,japanese_words,image_test,push,tasks,calendar_events,categories}.py`, `backend/rrule_utils.py` — 권한·구독·반복 일정·입력 검증
- `frontend/src/lib/{auth,api,push}.ts`, `frontend/src/app/{login,calendar,daily-course,hsk5,math,network,python,spring,sqld}/page.tsx`, `frontend/src/app/words/KanaStudy.tsx`, `frontend/src/components/{TodayStudy,WeekView,DayView}.tsx` — 등록 코드, 계정별 저장, 반복 일정과 푸시 처리
- `backend/tests/test_{spring_isolation,recurrence,calendar_recurrence,security_boundaries,csrf}.py` — 회귀 테스트
- `REVIEW_2026-09-28.md` — 수정 현황과 운영 후속 작업 기록

### 다음 세션
- 실제 서버 노출·덤프 공유 범위·비밀번호 교체와 PostgreSQL 마이그레이션 확인
- 브라우저에서 음량·반복 일정·푸시·계정 전환 확인
- Python 의존성 설치 파일의 해시 검증과 명시적 DB 마이그레이션 정리

## 2026-09-28 — 코드·보안 점검

### 완료
- 백엔드·프런트엔드·인증·계정 경계·배포 설정·SQL 덤프를 검토하고 우선순위별 후속 작업을 기록
- 추적 중인 DB 덤프의 사용자 정보, 포트 공개 설정, 계정 간 Spring 진도·푸시 구독 문제와 공용 사전 변경 권한을 확인
- 반복 규칙 생성 오류를 가상환경에서 재현하고 달력 반복 일정 표시 문제를 코드 경로로 확인
- 백엔드 테스트 10개, 프런트엔드 린트·타입 검사·빌드·음성 테스트 7개 통과; npm audit 취약점 0건 확인

### 변경된 파일
- `REVIEW_2026-09-28.md` — 보안·기능·유지보수 점검 결과와 수정 순서
- `CHANGELOG.md` — 이번 점검과 검증 결과 기록

### 다음 세션
- 덤프 노출 범위·운영 포트·DB 암호를 확인하고 필요한 교체와 네트워크 제한 진행
- 계정별 Spring 진도, 공용 사전 관리 권한, 푸시 구독 소유권 수정
- 반복 규칙 생성 및 달력 반복 일정 표시 수정, 브라우저 진도 계정 분리
- 음량 조절 변경의 실제 브라우저 화면·조작·청음 확인

## 2026-09-19 — 단어 발음 볼륨 조절

### 완료
- 단어 학습 화면 우측 상단에 볼륨 버튼, 0~100% 슬라이더, 음소거/해제 추가
- 중국어·영어·일본어·가나 발음에 공통 음량 적용 및 브라우저 저장
- 중국어 음성 파일 경로를 CSP media-src에 제한적으로 허용하고 재생 실패 시 브라우저 발음으로 전환
- 카드 전환 시 이전 재생과 지연된 실패 콜백을 정리해 지난 단어가 다시 재생되는 문제 방지
- 프로덕션 빌드, TypeScript 검사, 변경 소스 린트 및 음성 처리 회귀 테스트 7개 통과

### 변경된 파일
- `frontend/src/components/WordVolumeControl.tsx` — 볼륨 팝오버와 키보드 조작
- `frontend/src/lib/wordAudio.ts` — 공통 음량 저장, 음성 재생 및 취소 처리
- `frontend/src/app/words/page.tsx`, `frontend/src/app/words/KanaStudy.tsx` — 볼륨 컨트롤과 공통 재생 연결
- `frontend/next.config.mjs` — 중국어 음성 파일의 제한된 CSP 허용 경로
- `frontend/tests/wordAudio.test.mjs`, `frontend/package.json` — 재현 가능한 음성 처리 회귀 테스트

### 다음 세션
- 연결된 브라우저가 없어 진행하지 못한 실제 화면 배치, 슬라이더 조작, 새로고침 및 청음 확인

## 2026-09-02 — v1.0 안정화 2차

### 수정

- 중국어·영어·일본어 학습 진도와 즐겨찾기를 계정별 카드로 완전히 분리
- 통계·검색·복습 대기 수·푸시 알림·텔레그램 퀴즈에 사용자 필터 적용
- 기존 공유 학습 데이터를 마스터 계정으로 보존하는 PostgreSQL 자동 마이그레이션 추가
- 사용자별 `(user_id, word_id)` 고유 제약과 외래키 적용
- SQLite의 timezone 정보 없는 날짜도 안전하게 처리
- 사용자 격리 회귀 테스트 2개 추가
- 배포 전 DB 백업 및 복구 절차 문서화

### 검증

- PostgreSQL 16 기존 스키마 마이그레이션 및 데이터 보존 검사 통과
- 백엔드 테스트 5개와 컨테이너 상태 검사 통과
- 프런트 ESLint·TypeScript·프로덕션 빌드 통과
- npm audit 취약점 0건

## 2026-09-01 — v1.0 안정화 1차

### 수정

- 누락된 `/quizzes` 백엔드 라우터를 등록해 학습 퀴즈의 404 오류 해결
- 프런트 API·이미지 프록시를 동일 출처 `/api` 방식으로 통일
- 운영 환경에서 깨지던 이미지 테스트와 푸시 구독 요청 수정
- Docker 내부 DB 주소를 `db` 서비스로 고정하고 DB/API 상태 검사 추가
- JWT 비밀 키의 취약한 기본값 제거 및 32자 이상 설정 강제
- 백엔드 Docker 빌드에서 `.env`, 가상환경, 생성물을 제외해 비밀 유출 방지
- Next.js 16.3.4·React 19.2.4로 업데이트하고 npm 취약점 0건 확인
- ESLint flat config 전환 및 백엔드 기동·라우트 회귀 테스트 추가

### 검증

- 프런트 ESLint, TypeScript, 21개 정적 페이지 프로덕션 빌드 통과
- 백엔드 테스트 3개 및 애플리케이션 기동 검사 통과
- 백엔드·프런트 Docker 이미지 빌드 통과
- npm audit 취약점 0건

## 2026-06-02
### 완료
- Todo/캘린더 보완 구현 완료
  - Phase 1: Backend 반복 작업/이벤트
    - `Task`, `CalendarEvent` 모델에 `rrule`, `recurring_until`, `color` 필드 추가
    - `Task`, `WordCard` 모델에 `user_id` 외래키 추가
    - `rrule_utils.py` 신규: RRule 파싱/생성 유틸리티 (dateutil.rrule 기반)
    - `tasks.py` 라우터: 반복 작업 완료 시 다음 날짜 자동 생성 로직 추가
    - `calendar_events.py` 라우터: 색상, 반복 설정, 드래그앤드롭 이동 API 추가
    - `achievements.py` 라우터: 업적 체크/해금/통계 API 추가, streak/mastery/consistency 계산
    - `tasks.py`, `achievements.py`에 user_id 필터링 추가
  - Phase 2: 캘린더 보강
    - `WeekView.tsx` 컴포넌트: 주별 뷰 (24시간 × 7일 그리드, 드래그앤드롭)
    - `DayView.tsx` 컴포넌트: 일별 뷰 (24시간 타임라인, 이벤트/작업 표시)
    - `RecurrencePicker.tsx` 컴포넌트: 반복 설정 UI (매일/매주/매월/매년, 요일 선택)
    - `calendar/page.tsx`: 뷰 모드 토글 (월/주/일), 색상 선택, 반복 설정 UI 추가
    - `api.ts`: `calendarEvents.move`, `tasks.create` rrule, `achievements` API 추가
  - Phase 3: 통계/분석
    - `stats/page.tsx`: 업적 섹션 추가 (해금 진행률, 카테고리별, 해금된 업적 표시)
    - `achievements` API 연동: 업적 목록, 통계, 체크 기능

### 변경된 파일
- `backend/models.py` — Task, CalendarEvent, WordCard에 user_id, rrule, recurring_until, color 필드 추가
- `backend/rrule_utils.py` — 신규: RRule 파싱/생성 유틸리티
- `backend/routers/tasks.py` — 반복 작업 API, user_id 필터링 추가
- `backend/routers/calendar_events.py` — 색상, 반복, 드래그앤드롭 API 추가
- `backend/routers/achievements.py` — 업적 체크/해금/통계 API 추가
- `frontend/src/components/WeekView.tsx` — 신규: 주별 캘린더 뷰
- `frontend/src/components/DayView.tsx` — 신규: 일별 캘린더 뷰
- `frontend/src/components/RecurrencePicker.tsx` — 신규: 반복 설정 UI
- `frontend/src/app/calendar/page.tsx` — 뷰 모드 토글, 색상/반복 UI 추가
- `frontend/src/app/stats/page.tsx` — 업적 섹션 추가
- `frontend/src/lib/api.ts` — achievements API, calendarEvents.move 추가

### 다음 세션
- DB 마이그레이션 실행 (새 컬럼 반영)
- 테스트: 반복 작업 완료 시 다음 날짜 생성 확인
- 테스트: 캘린더 주/일 뷰, 드래그앤드롭 확인
- 테스트: 업적 시스템 동작 확인

---

## 2026-06-01
### 완료
- Spring 학습 커리큘럼 구현 완료 (Python/미적분 패턴)
  - 백엔드: `SpringTopic`, `SpringTopicCard` 모델 및 `/spring-topics` API 라우터
  - 시드 데이터: IoC/DI, AOP, MVC, Boot, JPA, Transaction, Security, REST, Testing, Validation 등 10단계 20개 주제
  - 프론트엔드: `spring/curriculum.ts`, `spring/challenge.ts`, `spring/page.tsx` (Python과 동일 구조)
  - 학습 UI: 📖 학습 / ✏️ 예제 / 🧠 연습 / 🏆 도전 (4개 이상 통과 시 다음 단계 해금)
  - 진행률 저장: localStorage 기반 spring_progress
- 백엔드 DB 스키마 수정: `SpringTopic.difficulty` varchar(10) → varchar(20) ("intermediate" 지원)
- 백엔드 라우터 추가: `spring_topics` 등록 (`/api/spring-topics/*`)
- 백엔드 재빌드 완료: Docker Compose로 이미지 재생성 및 컨테이너 재시작
- 시드 데이터 20개 완료: IoC Container부터 @Valid & Bean Validation까지

### 변경된 파일
- `backend/models.py` — SpringTopic, SpringTopicCard 모델 추가
- `backend/routers/spring_topics.py` — 신규: Spring 학습 주제 API 라우터 (FSRS 포함)
- `backend/routers/spring_topics.py` — SEED_TOPICS 20개 (모듈 레벨)
- `backend/main.py` — spring_topics 라우터 등록
- `frontend/src/app/spring/curriculum.ts` — Spring 10단계 커리큘럼 데이터
- `frontend/src/app/spring/challenge.ts` — Spring 도전 퀴즈 10단계 × 5문제
- `frontend/src/app/spring/page.tsx` — Spring 학습 메인 페이지 (Python과 동일 UI)

### 다음 세션
- Spring 학습 페이지 테스트 (localhost:3000/spring)
- 필요시 백엔드 Spring API 연동 (현재는 정적 데이터만 사용)

---

## 2026-04-30
### 완료
- HSK3~6 단어-뜻/예문 불일치 프로덕션 DB 수정
  - 로컬 DB에서 정확한 데이터로 SQL 생성 → 프로덕션 psql로 적용
  - HSK4: 601개 전부 일치 (기존 499개 불일치)
  - HSK3/5/6: 4099개 전부 일치
- fix 스크립트 DATABASE_URL 하드코딩 제거 (.env에서 읽도록 수정)

### 변경된 파일
- `backend/fix_hsk4_shift.py` — DATABASE_URL 하드코딩 → os.environ.get()
- `backend/fix_hsk4_rematch.py` — 동일
- `backend/fix_hsk4_phase2.py` — 동일
- `fix_hsk4_production.sql` — HSK4 프로덕션 수정 SQL (신규)
- `fix_hsk356_production.sql` — HSK3/5/6 프로덕션 수정 SQL (신규)

### 다음 세션
- 프로덕션에서 HSK 단어 UI 정상 동작 확인
- fix SQL 파일들 정리 (적용 완료 후 삭제 가능)

---

## 2026-04-15 (세션 10)
### 완료
- HSK3~6 누락 이미지 472개 재생성 완료 (누락 0개 달성)
  - 스타일 변경: watercolor/pastel → flat vector illustration, bold outlines, vibrant saturated colors
  - HSK3 年级 예문 수정 (단어 미포함 예문 → 올바른 예문으로 교체)
  - `regen_missing_images.py`: HSK3~6 통합 누락 이미지 재생성 스크립트 신규 작성

### 변경된 파일
- `backend/regen_missing_images.py` — 누락 이미지 통합 재생성 스크립트 (신규)

### 다음 세션
- 서버에 이미지 업로드 (scp/rsync로 test_output/ 폴더 전송)
- DB dump → 서버 반영

---

## 2026-04-14 (세션 9)
### 완료
- HSK4 단어-예문 불일치 100% 수정 (601개 → 전부 일치)
  - 원인: import 시 중복 row(等/对/过 등) 3개가 뜻/예문 shift 유발
  - Phase 1 (`fix_hsk4_rematch.py`): SQL 예문 기반 re-match로 358개 수정 (16% → 76%)
  - Phase 2 (`fix_hsk4_phase2.py`): 남은 141개 처리
    - SQL 충돌 해결 (욕심 알고리즘 + 1자 한자 복합어 판별): 106개 수정
    - 35개 미매칭 단어: 올바른 뜻 + 예문 직접 작성하여 하드코딩

### 변경된 파일
- `backend/fix_hsk4_rematch.py` — HSK4 예문 기반 뜻/예문 재매핑 (신규)
- `backend/fix_hsk4_phase2.py` — Phase 2 수정 스크립트, 복합어 판별 + 하드코딩 (신규)

### 다음 세션
- 필요 시 HSK4 이미지 생성 (`gen_hsk6_images.py` 방식으로)
- 서버에 수정된 DB 반영 (dump → 업로드)

---

## 2026-04-10 (세션 8)
### 완료
- 일본어 단어장 시스템 구축
  - `JapaneseWord` + `JapaneseWordCard` 모델, DB 테이블 생성
  - `/japanese-words` 라우터: daily/due/stats/today/list/review/favorite/favorites 엔드포인트
  - `import_japanese.py`: jamsinclair/open-anki-jlpt-decks CSV 다운로드 + GoogleTranslator en→ko 번역 (N5~N1 8,131개, 진행 중)
  - `add_japanese_examples.py`: Tatoeba jpn_sentences 기반 예문 생성 스크립트 (신규)
- 오늘의 학습 (Daily Quota) 기능
  - `/words/daily`: 전체 due 복습 + HSK 3~5 신규 15개 + HSK 1~2 신규 2개
  - `/english-words/daily`: 전체 due 복습 + 신규 15개
  - `/japanese-words/daily`: 전체 due 복습 + N5→N4 우선순위 신규 15개
  - 단어장 메인에 "오늘의 중국어/영어/일본어" 버튼 + 개수 배지
- 단어 카드 등급 배지: HSK 레벨(중국어), CEFR 레벨(영어), JLPT 레벨(일본어) 카드 오른쪽 위 표시
- 일본어 레벨별 공부 기능
  - JLPT N5~N1 레벨 선택 화면
  - `JaSwipeCard`: 한자 앞면, 요미가나, 한국어 뜻/예문 뒷면, TTS ja-JP
  - `JaReviewSession`: FSRS 기반 플래시카드 세션
  - `JaBrowseMode`: 일본어 단어 목록 브라우즈 + 즐겨찾기
- `showPicker()` NotAllowedError 수정: try/catch 폴백으로 `.click()` 사용
- stats 페이지 일본어 통계 추가 (ja_streak, ja_today, ja_levels)

### 변경된 파일
- `backend/models.py` — JapaneseWord·JapaneseWordCard 모델 추가
- `backend/routers/japanese_words.py` — 신규: 일본어 단어 전체 라우터
- `backend/routers/words.py` — daily·favorite·favorites 엔드포인트, is_favorite 응답 추가
- `backend/routers/english_words.py` — daily·favorite·favorites 엔드포인트, is_favorite 응답 추가
- `backend/routers/stats.py` — JapaneseWord·JapaneseWordCard 임포트, ja_streak/ja_today/ja_levels 추가
- `backend/main.py` — japanese_words 라우터 등록
- `backend/import_japanese.py` — 신규: JLPT N5~N1 단어 import 스크립트
- `backend/add_japanese_examples.py` — 신규: Tatoeba 일본어 예문 생성 스크립트
- `frontend/src/lib/api.ts` — JapaneseWord 인터페이스, japaneseWords API 객체, favorites 메서드 추가
- `frontend/src/app/words/page.tsx` — JA_LEVELS 상수, 일본어 상태/함수, JaBrowseMode·JaSwipeCard·JaReviewSession 컴포넌트, 레벨별 공부 일본어 버튼

- `add_japanese_examples.py` 실행 완료: 6,707/8,062개 예문 생성 (Tatoeba jpn_sentences + GoogleTranslator ja→ko)
- 로그인/회원가입/마스터 계정 인증 시스템 구현
  - `User` 모델 (username, hashed_password, is_master)
  - `/auth/login`, `/auth/signup`, `/auth/status` 엔드포인트
  - JWT 토큰 (30일) — python-jose + passlib bcrypt
  - 모든 기존 API 라우터에 Bearer 토큰 인증 필수화
  - `/admin/overview` 엔드포인트 (마스터 전용): 단어/할일/유저 현황
  - `/login` 페이지: 계정 없으면 자동 회원가입 모드, 첫 계정 = 마스터
  - `/admin` 페이지: 마스터 전용 시스템 대시보드
  - Next.js 미들웨어: 쿠키 기반 라우트 보호
  - 메인 헤더에 admin 링크 + 로그아웃 버튼

### 변경된 파일
- `backend/auth_utils.py` — 신규: JWT 유틸리티, get_current_user 의존성
- `backend/routers/auth.py` — 신규: 인증 라우터
- `backend/routers/admin.py` — 신규: 마스터 전용 어드민 라우터
- `backend/models.py` — User 모델 추가
- `backend/main.py` — auth/admin 라우터 등록, 기존 라우터에 인증 의존성 추가
- `backend/requirements.txt` — python-jose, passlib, python-multipart 추가
- `frontend/src/lib/auth.ts` — 신규: 토큰/쿠키 관리 유틸리티
- `frontend/src/lib/api.ts` — Authorization 헤더 자동 추가, authApi 객체, 401 시 /login 리다이렉트
- `frontend/src/middleware.ts` — 신규: 쿠키 기반 라우트 보호
- `frontend/src/app/login/page.tsx` — 신규: 로그인/회원가입 페이지
- `frontend/src/app/admin/page.tsx` — 신규: 마스터 어드민 대시보드
- `frontend/src/app/page.tsx` — admin 링크 + 로그아웃 버튼 추가

### 다음 세션
- 즐겨찾기 단어만 복습하는 모드
- 푸시 알림 + FSRS 서버사이드 스케줄링 (2단계)

---

## 2026-04-10 (세션 7)
### 완료
- HSK 1~2 단어 삽입 및 언락
  - `insert_hsk12.py` 실행: HSK 1 149개 / HSK 2 148개 DB 삽입
  - `words/page.tsx`에서 HSK 1~2 `locked: false`로 변경
  - `add_hsk12_examples.py`: Tatoeba 중국어 문장 + GoogleTranslator로 예문 생성 (실행 중)
- 단어 즐겨찾기 기능 추가
  - `words`, `english_words` 테이블에 `is_favorite` 컬럼 추가
  - `/words/{id}/favorite`, `/words/favorites` 엔드포인트 추가
  - `/english-words/{id}/favorite`, `/english-words/favorites` 엔드포인트 추가
  - 단어 브라우즈 카드에 별 아이콘 즐겨찾기 토글 버튼 추가 (중국어/영어 모두)
- 캘린더 일정 수정 기능 추가
  - `/calendar-events/{id}` PATCH 엔드포인트 추가
  - 캘린더 이벤트 목록에 연필 아이콘 클릭 시 인라인 수정 폼 표시

### 변경된 파일
- `backend/insert_hsk12.py` — 신규: HSK 1~2 단어 삽입 스크립트
- `backend/add_hsk12_examples.py` — 신규: HSK 1~2 예문 생성 스크립트 (Tatoeba+번역)
- `backend/models.py` — Word·EnglishWord에 is_favorite 컬럼 추가
- `backend/routers/words.py` — is_favorite 응답 필드, favorite·favorites 엔드포인트 추가
- `backend/routers/english_words.py` — is_favorite 응답 필드, favorite·favorites 엔드포인트 추가
- `backend/routers/calendar_events.py` — EventUpdate 모델, PATCH 엔드포인트 추가
- `frontend/src/lib/api.ts` — Word·EnglishWord에 is_favorite 타입, calendarEvents.update·words.favorite·englishWords.favorite 메서드 추가
- `frontend/src/app/words/page.tsx` — HSK 1~2 언락, StarButton 컴포넌트, ZhBrowseMode·EnBrowseMode 즐겨찾기 기능
- `frontend/src/app/calendar/page.tsx` — 이벤트 인라인 수정 폼 추가

### 다음 세션
- 즐겨찾기 단어만 따로 복습하는 모드 (즐겨찾기 필터 복습)
- 푸시 알림 + FSRS 서버사이드 스케줄링 (2단계)

---

## 2026-04-10 (세션 6)
### 완료
- 영어 단어장 DB 구축: `english_words` 테이블 생성, MUSE en-ko 15,868개 삽입
  - 음역 필터링 후 유효 단어 15,868개 / wordfreq 기반 CEFR 레벨(A1~C1) 태깅
- 영어 단어 FSRS 플래시카드 구현
  - `/english-words` API 라우터 (due/stats/today/review)
  - 카드 앞면 영어 단어 발음 (Web Speech API, en-US)
  - 단어장 진입 구조: 언어 선택(중국어/영어) → 레벨 선택 → 학습
- 단어 카드 앞면에 복사 버튼 추가 (SVG 아이콘, 복사 후 체크 표시)
- 캘린더 일정 기능 추가
  - `calendar_events` 테이블 신규 (title, event_date, event_time)
  - `/calendar-events` API 라우터 (CRUD)
  - 날짜별 이벤트 추가/삭제 인라인 UI
- 투두 due_at 필드 추가
  - `tasks` 테이블에 `due_at` 컬럼 추가 (ALTER TABLE)
  - AddTaskForm에 날짜/시간 선택 UI (클릭 시 현재+1시간 자동 설정)
  - TaskItem에 날짜 배지 표시
- 캘린더 그리드 개선: 완료(초록)/예정 투두(jeok)/일정(파랑) 색상 구분 점
- 로고 클릭 가능하게 변경, 단어장 설명 텍스트 수정
- 드래그 핸들 누를 때 scale 효과로 변경

### 변경된 파일
- `backend/models.py` — Task에 due_at, CalendarEvent·EnglishWord·EnglishWordCard 모델 추가
- `backend/routers/tasks.py` — due_at 필드, /scheduled 엔드포인트 추가
- `backend/routers/english_words.py` — 신규: 영어 단어 FSRS 라우터
- `backend/routers/calendar_events.py` — 신규: 캘린더 이벤트 CRUD 라우터
- `backend/main.py` — english_words, calendar_events 라우터 등록
- `backend/import_english.py` — 신규: MUSE en-ko import 스크립트
- `backend/add_english_levels.py` — 신규: wordfreq CEFR 레벨 태깅 스크립트
- `backend/gen_hsk4_images.py` — 신규: HSK4 watercolor 이미지 생성 스크립트
- `frontend/src/app/words/page.tsx` — 언어 선택 구조로 전면 개편, 영어 카드 컴포넌트 추가
- `frontend/src/app/calendar/page.tsx` — 이벤트+예정 투두 표시, 일정 추가 UI
- `frontend/src/app/page.tsx` — 로고 링크화, 단어장 설명 수정
- `frontend/src/components/AddTaskForm.tsx` — due_at 날짜/시간 선택 UI
- `frontend/src/components/TaskItem.tsx` — due_at 배지, 드래그 scale 효과
- `frontend/src/lib/api.ts` — EnglishWord·CalendarEvent 타입, 관련 API 메서드 추가
- `frontend/src/store/taskStore.ts` — addTask due_at 파라미터 추가

### 다음 세션
- HSK4 이미지 생성 실행 (python gen_hsk4_images.py, ~54분)
- 캘린더 일정 수정 기능 (현재 추가/삭제만 가능)
- 푸시 알림 + FSRS 서버사이드 스케줄링 (2단계)

---

## 2026-04-09 (세션 5)
### 완료
- HSK 6급 단어 전체 2500개 한국어 뜻 + 중국어 예문 + 한국어 번역 생성 및 DB 반영
  - 1/4 (ids 2211-2835): 이전 세션 완료
  - 2/4 (ids 2836-3460): 625개 — `hsk6_data_2.sql` + `append_hsk6_2.py`
  - 3/4 (ids 3461-4085): 625개 — `hsk6_data_3.sql` + `append_hsk6_3.py`
  - 4/4 (ids 4086-4710): 625개 — `hsk6_data_4.sql` + `append_hsk6_4.py`
  - `meaning` 컬럼에 저장 (초기 `korean` 컬럼명 오류 → `sed`로 수정)
  - 전체 HSK 6급 2500개 모두 filled 확인

### 변경된 파일
- `backend/hsk6_data_2.sql` — HSK 6급 2/4 배치 625개
- `backend/hsk6_data_3.sql` — HSK 6급 3/4 배치 625개
- `backend/hsk6_data_4.sql` — HSK 6급 4/4 배치 625개
- `backend/append_hsk6_2.py` — 2/4 뒷부분 312개 추가 스크립트
- `backend/append_hsk6_3.py` — 3/4 뒷부분 312개 추가 스크립트
- `backend/append_hsk6_4.py` — 4/4 뒷부분 312개 추가 스크립트

### 다음 세션
- 플래시카드 FSRS 시스템 구현 시작
- 푸시 알림(APScheduler + Web Push) 연동

---

## 2026-04-08 (세션 4)
### 완료
- HSK 4급 단어 601개 예문 + 한국어 뜻 + 병음 생성 및 DB 반영
  - `backend/hsk4_data.sql` (581개) + `backend/hsk4_data_fix.sql` (나머지 20개)
  - 포맷: `UPDATE words SET meaning=..., example_zh=..., example_ko=... WHERE id=N`
  - 일상 회화 중심 예문, HSK 4급 수준에 맞게 작성

### 변경된 파일
- `backend/hsk4_data.sql` — HSK 4급 단어 581개 데이터
- `backend/hsk4_data_fix.sql` — 나머지 20개 (id 891-910) 보완

### 다음 세션
- 2단계: 플래시카드 FSRS + 푸시 알림 시작
- HSK 5, 6급 예문 생성 (필요시)

---

## 2026-04-08 (세션 3)
### 완료
- Done List UI 개선: 오늘/이전 그룹핑, 완료 시간 표시, 뜻밖의 완료(urgency=low) ✨ 강조
- 로컬 캘린더 뷰 구현: 월별 그리드, 날짜별 완료 dot, 날짜 클릭 시 태스크 목록 표시
- 백엔드 `/tasks/history?year=&month=` 엔드포인트 추가
- 사이드바(PC) + 하단 네비(모바일) 에 캘린더 링크 추가

### 변경된 파일
- `backend/routers/tasks.py` — `/history` 엔드포인트 추가
- `frontend/src/lib/api.ts` — `api.tasks.history()` 추가
- `frontend/src/components/DoneList.tsx` — 신규: 오늘/이전 그룹, 완료시간, 뜻밖의 완료 강조
- `frontend/src/app/calendar/page.tsx` — 신규: 월별 캘린더 뷰
- `frontend/src/app/layout.tsx` — 사이드바에 캘린더 링크 추가
- `frontend/src/app/page.tsx` — DoneList 컴포넌트 연결, 하단 네비에 캘린더 추가

### 다음 세션
- 1단계 완료 → 2단계: 플래시카드 FSRS + 푸시 알림 시작
- recraft/ideogram 이미지 파라미터 오류 수정 (선택)

## 2026-04-08 (세션 2)
### 완료
- Replicate API로 단어 이미지 생성 테스트 스크립트 작성 (`test_images.py`)
- flux-dev, flux-schnell 결과 확인 (마음에 안 들어 스타일 변경)
- 새 스타일 4종 시도: flux-pro(flat illustration), recraft(vector), ideogram, sd3.5(pixar)
- flux-pro, sd3.5 결과 저장 완료 (recraft/ideogram는 API 파라미터 오류로 실패)

### 변경된 파일
- `backend/test_images.py` — 모델 4종 교체, 플래시카드용 단순 프롬프트로 변경, rate limit 딜레이 추가

### 다음 세션
- recraft/ideogram 파라미터 오류 수정 (`vector_illustration` → `digital_illustration/2d_art_poster`, `RESOLUTION_1024_1024` → `1024x1024`)
- 마음에 드는 스타일 확정 후 단어별 이미지 생성 파이프라인 연결
- 1단계 본 개발: Done List UI + 로컬 캘린더 뷰

## 2026-04-08
### 완료
- 프로젝트 기획 확정 (기술 스택, 개발 순서, AI 코치 규칙)
- `CLAUDE.md` 초안 작성
- `CHANGELOG.md` 초안 작성

### 변경된 파일
- `CLAUDE.md` — 최초 생성

### 다음 세션
- 1단계: Done List UI + 로컬 캘린더 뷰 개발 시작
- Next.js 프로젝트 초기 세팅 (`/frontend`)
- FastAPI 기본 구조 세팅 (`/backend`)
