DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        BEGIN
            ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'student';
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;
        BEGIN
            ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'professor';
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'material_source_type') THEN
        BEGIN
            ALTER TYPE material_source_type ADD VALUE IF NOT EXISTS 'professor_managed';
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;
        BEGIN
            ALTER TYPE material_source_type ADD VALUE IF NOT EXISTS 'admin_managed';
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;
    END IF;
END $$;

UPDATE users SET role = 'student' WHERE role::text = 'learner';
UPDATE users SET role = 'professor' WHERE role::text = 'teacher';
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'student';

UPDATE teacher_admin_profiles SET staff_role = 'professor' WHERE staff_role = 'teacher';
ALTER TABLE teacher_admin_profiles DROP CONSTRAINT IF EXISTS ck_teacher_admin_profiles_staff_role;
ALTER TABLE teacher_admin_profiles
    ADD CONSTRAINT ck_teacher_admin_profiles_staff_role CHECK (staff_role IN ('professor', 'admin'));

UPDATE materials SET source_type = 'professor_managed' WHERE source_type::text = 'teacher_managed';

ALTER TABLE materials ADD COLUMN IF NOT EXISTS quality_score NUMERIC(4,3) NOT NULL DEFAULT 0.500;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS ease_score NUMERIC(4,3) NOT NULL DEFAULT 0.500;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS verified_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

ALTER TABLE materials DROP CONSTRAINT IF EXISTS ck_materials_quality_score;
ALTER TABLE materials ADD CONSTRAINT ck_materials_quality_score CHECK (quality_score >= 0 AND quality_score <= 1);
ALTER TABLE materials DROP CONSTRAINT IF EXISTS ck_materials_ease_score;
ALTER TABLE materials ADD CONSTRAINT ck_materials_ease_score CHECK (ease_score >= 0 AND ease_score <= 1);

CREATE TABLE IF NOT EXISTS material_topic_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
    topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_material_topic_links_material_topic UNIQUE (material_id, topic_id)
);

INSERT INTO material_topic_links (material_id, topic_id)
SELECT m.id, m.topic_id
FROM materials AS m
WHERE m.topic_id IS NOT NULL
ON CONFLICT (material_id, topic_id) DO NOTHING;

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

CREATE INDEX IF NOT EXISTS ix_materials_is_active ON materials(is_active);
CREATE INDEX IF NOT EXISTS ix_materials_is_verified ON materials(is_verified);
CREATE INDEX IF NOT EXISTS ix_material_topic_links_topic_id ON material_topic_links(topic_id);
CREATE INDEX IF NOT EXISTS ix_material_likes_material_id ON material_likes(material_id);
CREATE INDEX IF NOT EXISTS ix_material_likes_user_id ON material_likes(user_id);
CREATE INDEX IF NOT EXISTS ix_topic_search_results_topic_id ON topic_search_results(topic_id);
CREATE INDEX IF NOT EXISTS ix_topic_search_results_user_id ON topic_search_results(user_id);
CREATE INDEX IF NOT EXISTS ix_topic_search_result_items_material_id ON topic_search_result_items(material_id);
