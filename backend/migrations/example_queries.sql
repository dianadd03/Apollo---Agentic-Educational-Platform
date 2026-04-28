-- 1. Materials filtered by normalized tag category and minimum relevance
SELECT
    m.id,
    m.canonical_name,
    mt.category,
    mt.relevance,
    m.difficulty,
    m.source_type,
    m.trust_score
FROM materials AS m
JOIN material_tags AS mt ON mt.material_id = m.id
WHERE mt.category = 'dynamic-programming'
  AND mt.relevance >= 0.80
ORDER BY mt.relevance DESC, m.trust_score DESC;

-- 2. Internet materials with strong user feedback
SELECT
    m.id,
    m.canonical_name,
    m.source_type,
    AVG(mf.rating) AS avg_rating,
    COUNT(*) FILTER (WHERE mf.is_saved) AS save_count
FROM materials AS m
JOIN material_feedback AS mf ON mf.material_id = m.id
WHERE m.source_type IN ('community_internet', 'general_internet')
GROUP BY m.id, m.canonical_name, m.source_type
HAVING AVG(mf.rating) >= 4.0
ORDER BY avg_rating DESC, save_count DESC;

-- 3. Queryable difficulty + trust filtering
SELECT
    m.id,
    m.canonical_name,
    m.material_type,
    m.difficulty,
    m.trust_level,
    m.trust_score
FROM materials AS m
WHERE m.difficulty = 'beginner'
  AND m.trust_level IN ('high', 'verified')
ORDER BY m.trust_score DESC, m.created_at DESC;

-- 4. Semantic retrieval with pgvector cosine distance
-- Replace :query_embedding with a real vector literal from your embedding model.
SELECT
    mc.material_id,
    m.canonical_name,
    mc.chunk_index,
    mc.chunk_text,
    mc.embedding <=> :query_embedding AS cosine_distance
FROM material_chunks AS mc
JOIN materials AS m ON m.id = mc.material_id
ORDER BY mc.embedding <=> :query_embedding
LIMIT 10;

-- 5. Find highly-rated materials for a topic and level chosen by a specific learner
SELECT
    t.title AS topic_title,
    ut.level AS learner_topic_level,
    m.canonical_name,
    AVG(mf.rating) AS avg_rating
FROM user_topics AS ut
JOIN topics AS t ON t.id = ut.topic_id
JOIN materials AS m ON m.topic_id = t.id
LEFT JOIN material_feedback AS mf ON mf.material_id = m.id
WHERE ut.user_id = '11111111-1111-1111-1111-111111111111'
GROUP BY t.title, ut.level, m.canonical_name
ORDER BY avg_rating DESC NULLS LAST, m.canonical_name;
