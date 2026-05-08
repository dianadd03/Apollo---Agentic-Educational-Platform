-- Epic 5: Problem Set Aggregator
-- Adds tables for problems aggregated from Codeforces / LeetCode / AtCoder
-- and for AI-generated "general problems" fallback (Story 5.4).

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'problem_source') THEN
        CREATE TYPE problem_source AS ENUM (
            'codeforces',
            'leetcode',
            'atcoder',
            'generated'
        );
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS problems (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source problem_source NOT NULL,
    external_id VARCHAR(120) NOT NULL,
    title VARCHAR(300) NOT NULL,
    url TEXT NOT NULL,
    raw_difficulty VARCHAR(60),
    normalized_difficulty INTEGER NOT NULL DEFAULT 5,
    difficulty_label topic_level NOT NULL DEFAULT 'intermediate',
    success_rate NUMERIC(4,3),
    tags JSON NOT NULL DEFAULT '[]'::json,
    is_generated BOOLEAN NOT NULL DEFAULT FALSE,
    generated_objective TEXT,
    last_fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_problems_source_external_id UNIQUE (source, external_id),
    CONSTRAINT ck_problems_normalized_difficulty CHECK (normalized_difficulty >= 1 AND normalized_difficulty <= 10),
    CONSTRAINT ck_problems_success_rate CHECK (success_rate IS NULL OR (success_rate >= 0 AND success_rate <= 1))
);

CREATE INDEX IF NOT EXISTS ix_problems_source ON problems(source);
CREATE INDEX IF NOT EXISTS ix_problems_difficulty_label ON problems(difficulty_label);
CREATE INDEX IF NOT EXISTS ix_problems_normalized_difficulty ON problems(normalized_difficulty);
CREATE INDEX IF NOT EXISTS ix_problems_last_fetched_at ON problems(last_fetched_at);

CREATE TABLE IF NOT EXISTS problem_topic_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    problem_id UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    match_score NUMERIC(4,3) NOT NULL DEFAULT 0.500,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_problem_topic_links_problem_topic UNIQUE (problem_id, topic_id),
    CONSTRAINT ck_problem_topic_links_match_score CHECK (match_score >= 0 AND match_score <= 1)
);

CREATE INDEX IF NOT EXISTS ix_problem_topic_links_topic_id ON problem_topic_links(topic_id);
CREATE INDEX IF NOT EXISTS ix_problem_topic_links_problem_id ON problem_topic_links(problem_id);
