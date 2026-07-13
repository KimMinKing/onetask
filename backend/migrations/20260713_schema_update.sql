BEGIN;

ALTER TABLE IF EXISTS public.tasks
  ADD COLUMN IF NOT EXISTS rrule character varying,
  ADD COLUMN IF NOT EXISTS recurring_until timestamp with time zone;

ALTER TABLE IF EXISTS public.calendar_events
  ADD COLUMN IF NOT EXISTS rrule character varying,
  ADD COLUMN IF NOT EXISTS recurring_until timestamp with time zone,
  ADD COLUMN IF NOT EXISTS color character varying(7);

ALTER TABLE IF EXISTS public.word_cards
  ADD COLUMN IF NOT EXISTS user_id integer;

ALTER TABLE IF EXISTS public.words
  ADD COLUMN IF NOT EXISTS is_favorite boolean DEFAULT false NOT NULL;

ALTER TABLE IF EXISTS public.english_words
  ADD COLUMN IF NOT EXISTS is_favorite boolean DEFAULT false NOT NULL;

ALTER TABLE IF EXISTS public.japanese_words
  ADD COLUMN IF NOT EXISTS is_favorite boolean DEFAULT false NOT NULL;

CREATE TABLE IF NOT EXISTS public.user_settings (
  id serial PRIMARY KEY,
  user_id integer NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  daily_goal_words integer NOT NULL DEFAULT 15,
  daily_goal_tasks integer NOT NULL DEFAULT 3,
  notification_hour integer NOT NULL DEFAULT 9,
  notification_enabled boolean NOT NULL DEFAULT true,
  theme character varying(10) NOT NULL DEFAULT 'dark',
  language_priority character varying(20) NOT NULL DEFAULT 'zh,en,ja'
);

CREATE TABLE IF NOT EXISTS public.achievements (
  id serial PRIMARY KEY,
  code character varying(50) NOT NULL UNIQUE,
  title character varying(100) NOT NULL,
  description character varying(200) NOT NULL,
  category character varying(50) NOT NULL,
  icon character varying(20) NOT NULL,
  requirement_value integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_achievements_code ON public.achievements(code);

CREATE TABLE IF NOT EXISTS public.user_achievements (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  achievement_id integer NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  word_id integer NOT NULL,
  word_lang character varying(5) NOT NULL,
  quiz_type character varying(20) NOT NULL,
  correct boolean NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.spring_topics (
  id serial PRIMARY KEY,
  title character varying(200) NOT NULL,
  category character varying(50) NOT NULL,
  description character varying(1000) NOT NULL,
  example_code character varying,
  notes character varying,
  difficulty character varying(20) NOT NULL,
  is_favorite boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.spring_topic_cards (
  id serial PRIMARY KEY,
  topic_id integer NOT NULL UNIQUE REFERENCES public.spring_topics(id) ON DELETE CASCADE,
  state integer NOT NULL DEFAULT 0,
  step integer,
  stability double precision NOT NULL DEFAULT 0.0,
  difficulty double precision NOT NULL DEFAULT 0.0,
  due timestamp with time zone NOT NULL DEFAULT now(),
  last_review timestamp with time zone,
  reps integer NOT NULL DEFAULT 0,
  lapses integer NOT NULL DEFAULT 0
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'word_cards'
  ) THEN
    ALTER TABLE public.word_cards
      ADD CONSTRAINT word_cards_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
      NOT VALID;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMIT;
