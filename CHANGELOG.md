# CHANGELOG — onetask

---

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
