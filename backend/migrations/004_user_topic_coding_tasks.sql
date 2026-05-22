-- Persist generated foundational coding tasks per saved user topic.

CREATE TABLE IF NOT EXISTS user_topic_coding_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_topic_id UUID NOT NULL REFERENCES user_topics(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    task TEXT NOT NULL,
    examples JSON NOT NULL DEFAULT '[]'::json,
    sequence_order INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_topic_coding_tasks_order UNIQUE (user_topic_id, sequence_order)
);

CREATE INDEX IF NOT EXISTS ix_user_topic_coding_tasks_user_topic_id ON user_topic_coding_tasks(user_topic_id);
