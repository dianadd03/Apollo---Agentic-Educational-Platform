CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('student', 'professor', 'admin');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'topic_level') THEN
        CREATE TYPE topic_level AS ENUM ('beginner', 'intermediate', 'advanced');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'material_type') THEN
        CREATE TYPE material_type AS ENUM ('article', 'video', 'book', 'documentation', 'tutorial', 'pdf', 'course', 'other');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'material_source_type') THEN
        CREATE TYPE material_source_type AS ENUM ('agent_selected', 'professor_managed', 'admin_managed', 'trusted_source', 'community_internet', 'general_internet');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'material_trust_level') THEN
        CREATE TYPE material_trust_level AS ENUM ('low', 'medium', 'high', 'verified');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'feedback_usefulness') THEN
        CREATE TYPE feedback_usefulness AS ENUM ('not_useful', 'somewhat_useful', 'useful', 'very_useful');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(320) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(120) NOT NULL,
    role user_role NOT NULL DEFAULT 'student',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token VARCHAR(255) NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS teacher_admin_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    staff_role VARCHAR(20) NOT NULL CHECK (staff_role IN ('professor', 'admin')),
    department VARCHAR(120),
    bio TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(160) NOT NULL UNIQUE,
    title VARCHAR(200) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    level topic_level NOT NULL,
    added_by_staff_id UUID REFERENCES teacher_admin_profiles(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_topics_user_topic UNIQUE (user_id, topic_id)
);

CREATE TABLE IF NOT EXISTS user_topic_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_topic_id UUID NOT NULL UNIQUE REFERENCES user_topics(id) ON DELETE CASCADE,
    completion_percent INTEGER NOT NULL DEFAULT 0 CHECK (completion_percent >= 0 AND completion_percent <= 100),
    current_stage VARCHAR(120),
    last_activity_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
    submitted_by_staff_id UUID REFERENCES teacher_admin_profiles(id) ON DELETE SET NULL,
    canonical_name VARCHAR(255) NOT NULL,
    link TEXT,
    file_path TEXT,
    material_type material_type NOT NULL,
    difficulty topic_level NOT NULL,
    source_type material_source_type NOT NULL,
    trust_level material_trust_level NOT NULL DEFAULT 'medium',
    trust_score NUMERIC(4,3) NOT NULL DEFAULT 0.500 CHECK (trust_score >= 0 AND trust_score <= 1),
    quality_score NUMERIC(4,3) NOT NULL DEFAULT 0.500 CHECK (quality_score >= 0 AND quality_score <= 1),
    ease_score NUMERIC(4,3) NOT NULL DEFAULT 0.500 CHECK (ease_score >= 0 AND ease_score <= 1),
    summary TEXT,
    is_published BOOLEAN NOT NULL DEFAULT TRUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    verified_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    metadata_json JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_material_location CHECK (link IS NOT NULL OR file_path IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS material_topic_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
    topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_material_topic_links_material_topic UNIQUE (material_id, topic_id)
);

CREATE TABLE IF NOT EXISTS material_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
    category VARCHAR(120) NOT NULL,
    relevance NUMERIC(4,3) NOT NULL CHECK (relevance >= 0 AND relevance <= 1),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_material_tags_material_category UNIQUE (material_id, category)
);

CREATE TABLE IF NOT EXISTS material_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    chunk_text TEXT NOT NULL,
    token_count INTEGER,
    embedding_model VARCHAR(120),
    embedding vector(1536),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_material_chunks_material_chunk_index UNIQUE (material_id, chunk_index)
);

CREATE TABLE IF NOT EXISTS material_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
    usefulness feedback_usefulness,
    is_saved BOOLEAN NOT NULL DEFAULT FALSE,
    would_recommend BOOLEAN,
    feedback_text TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_material_feedback_material_user UNIQUE (material_id, user_id)
);

CREATE TABLE IF NOT EXISTS material_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_material_likes_material_user UNIQUE (material_id, user_id)
);

CREATE TABLE IF NOT EXISTS topic_search_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    search_session_id VARCHAR(120),
    query_text VARCHAR(200) NOT NULL,
    coverage_source VARCHAR(40) NOT NULL DEFAULT 'db_internal',
    result_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS topic_search_result_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    search_result_id UUID NOT NULL REFERENCES topic_search_results(id) ON DELETE CASCADE,
    material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
    rank_position INTEGER NOT NULL,
    score_at_return_time NUMERIC(5,3),
    source_of_result VARCHAR(40) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_topic_search_result_items_rank UNIQUE (search_result_id, rank_position)
);

CREATE INDEX IF NOT EXISTS ix_users_email ON users(email);
CREATE INDEX IF NOT EXISTS ix_app_sessions_token ON app_sessions(token);
CREATE INDEX IF NOT EXISTS ix_topics_slug ON topics(slug);
CREATE INDEX IF NOT EXISTS ix_user_topics_user_id ON user_topics(user_id);
CREATE INDEX IF NOT EXISTS ix_user_topics_topic_id ON user_topics(topic_id);
CREATE INDEX IF NOT EXISTS ix_materials_topic_id ON materials(topic_id);
CREATE INDEX IF NOT EXISTS ix_materials_difficulty ON materials(difficulty);
CREATE INDEX IF NOT EXISTS ix_materials_source_type ON materials(source_type);
CREATE INDEX IF NOT EXISTS ix_materials_trust_level ON materials(trust_level);
CREATE INDEX IF NOT EXISTS ix_materials_is_active ON materials(is_active);
CREATE INDEX IF NOT EXISTS ix_materials_is_verified ON materials(is_verified);
CREATE INDEX IF NOT EXISTS ix_material_topic_links_topic_id ON material_topic_links(topic_id);
CREATE INDEX IF NOT EXISTS ix_material_tags_category ON material_tags(category);
CREATE INDEX IF NOT EXISTS ix_material_feedback_rating ON material_feedback(rating);
CREATE INDEX IF NOT EXISTS ix_material_feedback_usefulness ON material_feedback(usefulness);
CREATE INDEX IF NOT EXISTS ix_material_likes_material_id ON material_likes(material_id);
CREATE INDEX IF NOT EXISTS ix_material_likes_user_id ON material_likes(user_id);
CREATE INDEX IF NOT EXISTS ix_topic_search_results_topic_id ON topic_search_results(topic_id);
CREATE INDEX IF NOT EXISTS ix_topic_search_results_user_id ON topic_search_results(user_id);
CREATE INDEX IF NOT EXISTS ix_topic_search_result_items_material_id ON topic_search_result_items(material_id);
CREATE INDEX IF NOT EXISTS ix_material_chunks_material_id ON material_chunks(material_id);

CREATE INDEX IF NOT EXISTS ix_material_chunks_embedding_hnsw
ON material_chunks
USING hnsw (embedding vector_cosine_ops);
