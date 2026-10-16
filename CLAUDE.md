# CLAUDE.md — onetask

## Project
**onetask** — Personal learning + schedule dashboard with AI coach.
Multiple accounts with per-user progress. Self-hosted on Oracle Cloud.

## Stack
- **Frontend**: Next.js 16 (App Router) + Tailwind CSS + Zustand
- **Backend**: FastAPI (Python) + PostgreSQL + APScheduler
- **Crawling**: Playwright (run locally → CSV upload, not server-side)
- **Push**: Web Push via VAPID
- **External**: Google Calendar API (OAuth2), Claude API (AI coach)
- **Infra**: Oracle Cloud + Cloudflare (DNS/SSL)

## User Traits (apply to ALL suggestions)
- Perfectionist → overplans → guilt cycles
- Prefers flexibility, immediate reward, flow-state work
- Anti-suppressive scheduling

## Core Rules

### AI Coach Behavior
1. **No fake motivation.** Never use inspirational quotes or pressure language.
2. **Break it down.** Any large task list → pick the single easiest 3-min first step only.
3. **Block overplanning.** If daily plan looks packed → "이 중 1개만 남기고 나머지 빼자" and reduce it.
4. **70% rule forgiveness.** Missed cards/tasks → never criticize. Say: "어제 건 넘어가고 오늘은 이것만 가볍게 시작하자."
5. **Context-aware.** Coach reads today's Done List + overdue card count + calendar before responding.

### UI Logic
- **Done List first** (not To-Do). Highlight completed + unexpected wins.
- **Flashcards**: Show max 1–2 cards/hour via push notification popup. Never show backlog count.
- **CS Learning**: Top-down only. Show full working project first, reverse-engineer after.

### FSRS Algorithm
- Use `py-fsrs` (open-source Python port).
- Schedule reviews server-side; deliver via APScheduler push jobs.
- Never surface "you have N cards due" messaging to user.

## Dev Order (strict — do not skip ahead)
1. Done List UI + local calendar view
2. Flashcard system + FSRS + push notifications
3. Google Calendar API integration
4. Claude API coach integration

## File Structure (target)
```
/frontend   → Next.js app
/backend    → FastAPI app
  /routers  → calendar, cards, done_list, coach
  /fsrs     → py-fsrs integration
  /crawler  → Playwright scripts (run locally)
/db         → PostgreSQL migrations (Alembic)
```

## Constraints
- No server-side Naver crawling (IP block risk + ToS). Local only → CSV import.
- Korean UI language throughout.
- Mobile-responsive from day one (used on PC + mobile browser).

## Changelog Rule (MUST FOLLOW)
**매 세션 종료 전 반드시 `CHANGELOG.md`에 기록할 것.**

기록 형식:
```md
## YYYY-MM-DD
### 완료
- 작업 내용

### 변경된 파일
- `경로/파일명` — 변경 이유

### 다음 세션
- 이어서 할 것
```

- 생략 금지. 파일 1개라도 건드렸으면 반드시 기록.
- 세션 시작 시 `CHANGELOG.md` 마지막 항목부터 읽고 컨텍스트 복원.
