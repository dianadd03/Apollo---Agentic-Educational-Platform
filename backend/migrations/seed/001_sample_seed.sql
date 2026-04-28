INSERT INTO users (id, email, password_hash, full_name, role)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'student@apollo.dev', 'seeded-password-hash', 'Sample Student', 'student'),
    ('22222222-2222-2222-2222-222222222222', 'professor@apollo.dev', 'seeded-password-hash', 'Sample Professor', 'professor')
ON CONFLICT (id) DO NOTHING;

INSERT INTO teacher_admin_profiles (id, user_id, staff_role, department, bio)
VALUES
    ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'professor', 'Computer Science', 'Faculty curator for algorithms and systems materials.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO topics (id, slug, title, description)
VALUES
    ('44444444-4444-4444-4444-444444444444', 'dynamic-programming', 'Dynamic Programming', 'Optimization through overlapping subproblems and memoization/table building.'),
    ('55555555-5555-5555-5555-555555555555', 'graphs', 'Graphs', 'Graph representations, traversals, and shortest paths.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO user_topics (id, user_id, topic_id, level, notes)
VALUES
    ('66666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'intermediate', 'Needs more practice with state transitions.')
ON CONFLICT (user_id, topic_id) DO NOTHING;

INSERT INTO materials (
    id,
    topic_id,
    submitted_by_staff_id,
    canonical_name,
    link,
    material_type,
    difficulty,
    source_type,
    trust_level,
    trust_score,
    quality_score,
    ease_score,
    summary,
    is_published,
    is_active,
    is_verified,
    metadata_json
)
VALUES
    (
        '77777777-7777-7777-7777-777777777777',
        '44444444-4444-4444-4444-444444444444',
        '33333333-3333-3333-3333-333333333333',
        'Dynamic Programming Patterns for Interviews',
        'https://example.edu/dp-patterns',
        'article',
        'intermediate',
        'professor_managed',
        'verified',
        0.940,
        0.920,
        0.760,
        'Curated overview of common DP patterns, recurrence design, and optimization trade-offs.',
        TRUE,
        TRUE,
        TRUE,
        '{"seeded": true}'::jsonb
    ),
    (
        '88888888-8888-8888-8888-888888888888',
        '55555555-5555-5555-5555-555555555555',
        NULL,
        'Graph Algorithms Crash Course',
        'https://www.youtube.com/watch?v=graph-course',
        'video',
        'beginner',
        'community_internet',
        'high',
        0.820,
        0.780,
        0.860,
        'Introductory graph traversal and shortest path walkthrough.',
        TRUE,
        TRUE,
        FALSE,
        '{"seeded": true}'::jsonb
    )
ON CONFLICT (id) DO NOTHING;

INSERT INTO material_topic_links (material_id, topic_id)
VALUES
    ('77777777-7777-7777-7777-777777777777', '44444444-4444-4444-4444-444444444444'),
    ('88888888-8888-8888-8888-888888888888', '55555555-5555-5555-5555-555555555555')
ON CONFLICT (material_id, topic_id) DO NOTHING;

INSERT INTO material_tags (material_id, category, relevance)
VALUES
    ('77777777-7777-7777-7777-777777777777', 'dynamic programming', 1.000),
    ('77777777-7777-7777-7777-777777777777', 'memoization', 0.920),
    ('88888888-8888-8888-8888-888888888888', 'graphs', 1.000)
ON CONFLICT (material_id, category) DO NOTHING;

INSERT INTO material_feedback (material_id, user_id, rating, usefulness, is_saved, would_recommend, feedback_text)
VALUES
    ('77777777-7777-7777-7777-777777777777', '11111111-1111-1111-1111-111111111111', 5, 'very_useful', TRUE, TRUE, 'Helpful explanation of recurrence choices.')
ON CONFLICT (material_id, user_id) DO NOTHING;
