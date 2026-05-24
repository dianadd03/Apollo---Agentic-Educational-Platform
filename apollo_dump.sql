--
-- PostgreSQL database dump
--

\restrict NMs7Hf48xnFzytRLeGidKXC51Z7FPTaeU0WYzLFtVxV3tc1MToG7Q8k1Xf5LRsG

-- Dumped from database version 18.3 (Debian 18.3-1.pgdg12+1)
-- Dumped by pg_dump version 18.3 (Debian 18.3-1.pgdg12+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.user_topics DROP CONSTRAINT IF EXISTS user_topics_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.user_topics DROP CONSTRAINT IF EXISTS user_topics_topic_id_fkey;
ALTER TABLE IF EXISTS ONLY public.user_topics DROP CONSTRAINT IF EXISTS user_topics_added_by_staff_id_fkey;
ALTER TABLE IF EXISTS ONLY public.user_topic_progress DROP CONSTRAINT IF EXISTS user_topic_progress_user_topic_id_fkey;
ALTER TABLE IF EXISTS ONLY public.user_topic_coding_tasks DROP CONSTRAINT IF EXISTS user_topic_coding_tasks_user_topic_id_fkey;
ALTER TABLE IF EXISTS ONLY public.topic_search_results DROP CONSTRAINT IF EXISTS topic_search_results_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.topic_search_results DROP CONSTRAINT IF EXISTS topic_search_results_topic_id_fkey;
ALTER TABLE IF EXISTS ONLY public.topic_search_result_items DROP CONSTRAINT IF EXISTS topic_search_result_items_search_result_id_fkey;
ALTER TABLE IF EXISTS ONLY public.topic_search_result_items DROP CONSTRAINT IF EXISTS topic_search_result_items_material_id_fkey;
ALTER TABLE IF EXISTS ONLY public.teacher_admin_profiles DROP CONSTRAINT IF EXISTS teacher_admin_profiles_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.problem_topic_links DROP CONSTRAINT IF EXISTS problem_topic_links_topic_id_fkey;
ALTER TABLE IF EXISTS ONLY public.problem_topic_links DROP CONSTRAINT IF EXISTS problem_topic_links_problem_id_fkey;
ALTER TABLE IF EXISTS ONLY public.materials DROP CONSTRAINT IF EXISTS materials_verified_by_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.materials DROP CONSTRAINT IF EXISTS materials_topic_id_fkey;
ALTER TABLE IF EXISTS ONLY public.materials DROP CONSTRAINT IF EXISTS materials_submitted_by_staff_id_fkey;
ALTER TABLE IF EXISTS ONLY public.material_topic_links DROP CONSTRAINT IF EXISTS material_topic_links_topic_id_fkey;
ALTER TABLE IF EXISTS ONLY public.material_topic_links DROP CONSTRAINT IF EXISTS material_topic_links_material_id_fkey;
ALTER TABLE IF EXISTS ONLY public.material_tags DROP CONSTRAINT IF EXISTS material_tags_material_id_fkey;
ALTER TABLE IF EXISTS ONLY public.material_likes DROP CONSTRAINT IF EXISTS material_likes_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.material_likes DROP CONSTRAINT IF EXISTS material_likes_material_id_fkey;
ALTER TABLE IF EXISTS ONLY public.material_feedback DROP CONSTRAINT IF EXISTS material_feedback_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.material_feedback DROP CONSTRAINT IF EXISTS material_feedback_material_id_fkey;
ALTER TABLE IF EXISTS ONLY public.material_chunks DROP CONSTRAINT IF EXISTS material_chunks_material_id_fkey;
ALTER TABLE IF EXISTS ONLY public.app_sessions DROP CONSTRAINT IF EXISTS app_sessions_user_id_fkey;
DROP INDEX IF EXISTS public.ix_users_email;
DROP INDEX IF EXISTS public.ix_user_topics_user_id;
DROP INDEX IF EXISTS public.ix_user_topics_topic_id;
DROP INDEX IF EXISTS public.ix_user_topic_coding_tasks_user_topic_id;
DROP INDEX IF EXISTS public.ix_topics_slug;
DROP INDEX IF EXISTS public.ix_topic_search_results_user_id;
DROP INDEX IF EXISTS public.ix_topic_search_results_topic_id;
DROP INDEX IF EXISTS public.ix_topic_search_result_items_material_id;
DROP INDEX IF EXISTS public.ix_problems_source;
DROP INDEX IF EXISTS public.ix_problems_normalized_difficulty;
DROP INDEX IF EXISTS public.ix_problems_last_fetched_at;
DROP INDEX IF EXISTS public.ix_problems_difficulty_label;
DROP INDEX IF EXISTS public.ix_problem_topic_links_topic_id;
DROP INDEX IF EXISTS public.ix_problem_topic_links_problem_id;
DROP INDEX IF EXISTS public.ix_materials_trust_level;
DROP INDEX IF EXISTS public.ix_materials_topic_id;
DROP INDEX IF EXISTS public.ix_materials_source_type;
DROP INDEX IF EXISTS public.ix_materials_is_verified;
DROP INDEX IF EXISTS public.ix_materials_is_active;
DROP INDEX IF EXISTS public.ix_materials_difficulty;
DROP INDEX IF EXISTS public.ix_material_topic_links_topic_id;
DROP INDEX IF EXISTS public.ix_material_tags_category;
DROP INDEX IF EXISTS public.ix_material_likes_user_id;
DROP INDEX IF EXISTS public.ix_material_likes_material_id;
DROP INDEX IF EXISTS public.ix_material_feedback_usefulness;
DROP INDEX IF EXISTS public.ix_material_feedback_rating;
DROP INDEX IF EXISTS public.ix_material_chunks_material_id;
DROP INDEX IF EXISTS public.ix_material_chunks_embedding_hnsw;
DROP INDEX IF EXISTS public.ix_app_sessions_token;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_email_key;
ALTER TABLE IF EXISTS ONLY public.user_topics DROP CONSTRAINT IF EXISTS user_topics_pkey;
ALTER TABLE IF EXISTS ONLY public.user_topic_progress DROP CONSTRAINT IF EXISTS user_topic_progress_user_topic_id_key;
ALTER TABLE IF EXISTS ONLY public.user_topic_progress DROP CONSTRAINT IF EXISTS user_topic_progress_pkey;
ALTER TABLE IF EXISTS ONLY public.user_topic_coding_tasks DROP CONSTRAINT IF EXISTS user_topic_coding_tasks_pkey;
ALTER TABLE IF EXISTS ONLY public.user_topics DROP CONSTRAINT IF EXISTS uq_user_topics_user_topic;
ALTER TABLE IF EXISTS ONLY public.user_topic_coding_tasks DROP CONSTRAINT IF EXISTS uq_user_topic_coding_tasks_order;
ALTER TABLE IF EXISTS ONLY public.topic_search_result_items DROP CONSTRAINT IF EXISTS uq_topic_search_result_items_rank;
ALTER TABLE IF EXISTS ONLY public.problems DROP CONSTRAINT IF EXISTS uq_problems_source_external_id;
ALTER TABLE IF EXISTS ONLY public.problem_topic_links DROP CONSTRAINT IF EXISTS uq_problem_topic_links_problem_topic;
ALTER TABLE IF EXISTS ONLY public.material_topic_links DROP CONSTRAINT IF EXISTS uq_material_topic_links_material_topic;
ALTER TABLE IF EXISTS ONLY public.material_tags DROP CONSTRAINT IF EXISTS uq_material_tags_material_category;
ALTER TABLE IF EXISTS ONLY public.material_likes DROP CONSTRAINT IF EXISTS uq_material_likes_material_user;
ALTER TABLE IF EXISTS ONLY public.material_feedback DROP CONSTRAINT IF EXISTS uq_material_feedback_material_user;
ALTER TABLE IF EXISTS ONLY public.material_chunks DROP CONSTRAINT IF EXISTS uq_material_chunks_material_chunk_index;
ALTER TABLE IF EXISTS ONLY public.topics DROP CONSTRAINT IF EXISTS topics_title_key;
ALTER TABLE IF EXISTS ONLY public.topics DROP CONSTRAINT IF EXISTS topics_slug_key;
ALTER TABLE IF EXISTS ONLY public.topics DROP CONSTRAINT IF EXISTS topics_pkey;
ALTER TABLE IF EXISTS ONLY public.topic_search_results DROP CONSTRAINT IF EXISTS topic_search_results_pkey;
ALTER TABLE IF EXISTS ONLY public.topic_search_result_items DROP CONSTRAINT IF EXISTS topic_search_result_items_pkey;
ALTER TABLE IF EXISTS ONLY public.teacher_admin_profiles DROP CONSTRAINT IF EXISTS teacher_admin_profiles_user_id_key;
ALTER TABLE IF EXISTS ONLY public.teacher_admin_profiles DROP CONSTRAINT IF EXISTS teacher_admin_profiles_pkey;
ALTER TABLE IF EXISTS ONLY public.problems DROP CONSTRAINT IF EXISTS problems_pkey;
ALTER TABLE IF EXISTS ONLY public.problem_topic_links DROP CONSTRAINT IF EXISTS problem_topic_links_pkey;
ALTER TABLE IF EXISTS ONLY public.materials DROP CONSTRAINT IF EXISTS materials_pkey;
ALTER TABLE IF EXISTS ONLY public.material_topic_links DROP CONSTRAINT IF EXISTS material_topic_links_pkey;
ALTER TABLE IF EXISTS ONLY public.material_tags DROP CONSTRAINT IF EXISTS material_tags_pkey;
ALTER TABLE IF EXISTS ONLY public.material_likes DROP CONSTRAINT IF EXISTS material_likes_pkey;
ALTER TABLE IF EXISTS ONLY public.material_feedback DROP CONSTRAINT IF EXISTS material_feedback_pkey;
ALTER TABLE IF EXISTS ONLY public.material_chunks DROP CONSTRAINT IF EXISTS material_chunks_pkey;
ALTER TABLE IF EXISTS ONLY public.app_sessions DROP CONSTRAINT IF EXISTS app_sessions_token_key;
ALTER TABLE IF EXISTS ONLY public.app_sessions DROP CONSTRAINT IF EXISTS app_sessions_pkey;
DROP TABLE IF EXISTS public.users;
DROP TABLE IF EXISTS public.user_topics;
DROP TABLE IF EXISTS public.user_topic_progress;
DROP TABLE IF EXISTS public.user_topic_coding_tasks;
DROP TABLE IF EXISTS public.topics;
DROP TABLE IF EXISTS public.topic_search_results;
DROP TABLE IF EXISTS public.topic_search_result_items;
DROP TABLE IF EXISTS public.teacher_admin_profiles;
DROP TABLE IF EXISTS public.problems;
DROP TABLE IF EXISTS public.problem_topic_links;
DROP TABLE IF EXISTS public.materials;
DROP TABLE IF EXISTS public.material_topic_links;
DROP TABLE IF EXISTS public.material_tags;
DROP TABLE IF EXISTS public.material_likes;
DROP TABLE IF EXISTS public.material_feedback;
DROP TABLE IF EXISTS public.material_chunks;
DROP TABLE IF EXISTS public.app_sessions;
DROP TYPE IF EXISTS public.user_role;
DROP TYPE IF EXISTS public.topic_level;
DROP TYPE IF EXISTS public.problem_source;
DROP TYPE IF EXISTS public.material_type;
DROP TYPE IF EXISTS public.material_trust_level;
DROP TYPE IF EXISTS public.material_source_type;
DROP TYPE IF EXISTS public.feedback_usefulness;
DROP EXTENSION IF EXISTS vector;
DROP EXTENSION IF EXISTS pgcrypto;
--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: vector; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;


--
-- Name: EXTENSION vector; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION vector IS 'vector data type and ivfflat and hnsw access methods';


--
-- Name: feedback_usefulness; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.feedback_usefulness AS ENUM (
    'not_useful',
    'somewhat_useful',
    'useful',
    'very_useful'
);


ALTER TYPE public.feedback_usefulness OWNER TO postgres;

--
-- Name: material_source_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.material_source_type AS ENUM (
    'agent_selected',
    'teacher_managed',
    'trusted_source',
    'community_internet',
    'general_internet',
    'professor_managed',
    'admin_managed'
);


ALTER TYPE public.material_source_type OWNER TO postgres;

--
-- Name: material_trust_level; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.material_trust_level AS ENUM (
    'low',
    'medium',
    'high',
    'verified'
);


ALTER TYPE public.material_trust_level OWNER TO postgres;

--
-- Name: material_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.material_type AS ENUM (
    'article',
    'video',
    'book',
    'documentation',
    'tutorial',
    'pdf',
    'course',
    'other'
);


ALTER TYPE public.material_type OWNER TO postgres;

--
-- Name: problem_source; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.problem_source AS ENUM (
    'codeforces',
    'leetcode',
    'atcoder',
    'generated'
);


ALTER TYPE public.problem_source OWNER TO postgres;

--
-- Name: topic_level; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.topic_level AS ENUM (
    'beginner',
    'intermediate',
    'advanced',
    'expert'
);


ALTER TYPE public.topic_level OWNER TO postgres;

--
-- Name: user_role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.user_role AS ENUM (
    'learner',
    'teacher',
    'admin',
    'student',
    'professor'
);


ALTER TYPE public.user_role OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: app_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.app_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    token character varying(255) NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone
);


ALTER TABLE public.app_sessions OWNER TO postgres;

--
-- Name: material_chunks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.material_chunks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    material_id uuid NOT NULL,
    chunk_index integer NOT NULL,
    chunk_text text NOT NULL,
    token_count integer,
    embedding_model character varying(120),
    embedding public.vector(1536),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.material_chunks OWNER TO postgres;

--
-- Name: material_feedback; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.material_feedback (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    material_id uuid NOT NULL,
    user_id uuid NOT NULL,
    rating integer,
    usefulness public.feedback_usefulness,
    is_saved boolean DEFAULT false NOT NULL,
    would_recommend boolean,
    feedback_text text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT material_feedback_rating_check CHECK (((rating IS NULL) OR ((rating >= 1) AND (rating <= 5))))
);


ALTER TABLE public.material_feedback OWNER TO postgres;

--
-- Name: material_likes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.material_likes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    material_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.material_likes OWNER TO postgres;

--
-- Name: material_tags; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.material_tags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    material_id uuid NOT NULL,
    category character varying(120) NOT NULL,
    relevance numeric(4,3) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT material_tags_relevance_check CHECK (((relevance >= (0)::numeric) AND (relevance <= (1)::numeric)))
);


ALTER TABLE public.material_tags OWNER TO postgres;

--
-- Name: material_topic_links; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.material_topic_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    material_id uuid NOT NULL,
    topic_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.material_topic_links OWNER TO postgres;

--
-- Name: materials; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.materials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    topic_id uuid,
    submitted_by_staff_id uuid,
    canonical_name character varying(255) NOT NULL,
    link text,
    file_path text,
    material_type public.material_type NOT NULL,
    difficulty public.topic_level NOT NULL,
    source_type public.material_source_type NOT NULL,
    trust_level public.material_trust_level DEFAULT 'medium'::public.material_trust_level NOT NULL,
    trust_score numeric(4,3) DEFAULT 0.500 NOT NULL,
    summary text,
    is_published boolean DEFAULT true NOT NULL,
    metadata_json jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    quality_score numeric(4,3) DEFAULT 0.500 NOT NULL,
    ease_score numeric(4,3) DEFAULT 0.500 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    is_verified boolean DEFAULT false NOT NULL,
    verified_by_user_id uuid,
    verified_at timestamp with time zone,
    CONSTRAINT ck_material_location CHECK (((link IS NOT NULL) OR (file_path IS NOT NULL))),
    CONSTRAINT ck_materials_ease_score CHECK (((ease_score >= (0)::numeric) AND (ease_score <= (1)::numeric))),
    CONSTRAINT ck_materials_quality_score CHECK (((quality_score >= (0)::numeric) AND (quality_score <= (1)::numeric))),
    CONSTRAINT materials_trust_score_check CHECK (((trust_score >= (0)::numeric) AND (trust_score <= (1)::numeric)))
);


ALTER TABLE public.materials OWNER TO postgres;

--
-- Name: problem_topic_links; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.problem_topic_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    problem_id uuid NOT NULL,
    topic_id uuid NOT NULL,
    match_score numeric(4,3) DEFAULT 0.500 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_problem_topic_links_match_score CHECK (((match_score >= (0)::numeric) AND (match_score <= (1)::numeric)))
);


ALTER TABLE public.problem_topic_links OWNER TO postgres;

--
-- Name: problems; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.problems (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    source public.problem_source NOT NULL,
    external_id character varying(120) NOT NULL,
    title character varying(300) NOT NULL,
    url text NOT NULL,
    raw_difficulty character varying(60),
    normalized_difficulty integer DEFAULT 5 NOT NULL,
    difficulty_label public.topic_level DEFAULT 'intermediate'::public.topic_level NOT NULL,
    success_rate numeric(4,3),
    tags json DEFAULT '[]'::json NOT NULL,
    is_generated boolean DEFAULT false NOT NULL,
    generated_objective text,
    last_fetched_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_problems_normalized_difficulty CHECK (((normalized_difficulty >= 1) AND (normalized_difficulty <= 10))),
    CONSTRAINT ck_problems_success_rate CHECK (((success_rate IS NULL) OR ((success_rate >= (0)::numeric) AND (success_rate <= (1)::numeric))))
);


ALTER TABLE public.problems OWNER TO postgres;

--
-- Name: teacher_admin_profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.teacher_admin_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    staff_role character varying(20) NOT NULL,
    department character varying(120),
    bio text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_teacher_admin_profiles_staff_role CHECK (((staff_role)::text = ANY ((ARRAY['professor'::character varying, 'admin'::character varying])::text[])))
);


ALTER TABLE public.teacher_admin_profiles OWNER TO postgres;

--
-- Name: topic_search_result_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.topic_search_result_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    search_result_id uuid NOT NULL,
    material_id uuid NOT NULL,
    rank_position integer NOT NULL,
    score_at_return_time numeric(5,3),
    source_of_result character varying(40) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.topic_search_result_items OWNER TO postgres;

--
-- Name: topic_search_results; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.topic_search_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    topic_id uuid NOT NULL,
    user_id uuid NOT NULL,
    search_session_id character varying(120),
    query_text character varying(200) NOT NULL,
    coverage_source character varying(40) DEFAULT 'db_internal'::character varying NOT NULL,
    result_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.topic_search_results OWNER TO postgres;

--
-- Name: topics; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.topics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug character varying(160) NOT NULL,
    title character varying(200) NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.topics OWNER TO postgres;

--
-- Name: user_topic_coding_tasks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_topic_coding_tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_topic_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    task text NOT NULL,
    examples json DEFAULT '[]'::json NOT NULL,
    sequence_order integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.user_topic_coding_tasks OWNER TO postgres;

--
-- Name: user_topic_progress; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_topic_progress (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_topic_id uuid NOT NULL,
    completion_percent integer DEFAULT 0 NOT NULL,
    current_stage character varying(120),
    last_activity_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT user_topic_progress_completion_percent_check CHECK (((completion_percent >= 0) AND (completion_percent <= 100)))
);


ALTER TABLE public.user_topic_progress OWNER TO postgres;

--
-- Name: user_topics; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_topics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    topic_id uuid NOT NULL,
    level public.topic_level NOT NULL,
    added_by_staff_id uuid,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.user_topics OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email character varying(320) NOT NULL,
    password_hash character varying(255) NOT NULL,
    full_name character varying(120) NOT NULL,
    role public.user_role DEFAULT 'student'::public.user_role NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Data for Name: app_sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.app_sessions (id, token, user_id, created_at, expires_at) FROM stdin;
6d96f172-0263-439b-82b6-18b3c670ba27	YvKaihIx6zdT6nfZZ2hnGMlP-vrhMeD3R5zOEvABSJU	f8fa7bc5-e05e-4754-a559-2a15b19a4390	2026-04-07 12:54:48.265603+00	\N
4513651a-9081-48fc-a0aa-aa83b1de3ca6	tqpAf24SDr77qRU3deFOeqFPd7O-QZEcKjgrfLXtaBU	9a7ed03e-207c-4e4e-937d-c98796eda986	2026-04-11 12:24:50.057635+00	\N
524a8830-2112-4567-9b41-51abf6c593c2	IBtbD2I2N1gfD-tz0rTdT0pugSyLIDfaz5AhKr5Zh7g	9a7ed03e-207c-4e4e-937d-c98796eda986	2026-04-11 12:26:22.751544+00	\N
fb71b7a1-aa55-4b7f-b123-def263f40d29	L29XMFgsaCh5IHf57fkgY83Cs8uHGf2BWx2ek3QYJwk	f8fa7bc5-e05e-4754-a559-2a15b19a4390	2026-04-11 12:26:30.703471+00	\N
7bfae60f-1fb7-4bfc-870d-a443a3905274	cG8FBsA7KYxoMipyXvoUuJyIPKHoIATowTGWdNNkzqU	9a7ed03e-207c-4e4e-937d-c98796eda986	2026-04-11 13:30:01.987193+00	\N
439fa0b4-cde5-4369-a2ea-429c23350d9f	64gTH1sBJm7TUsT8R8Zzpb1zFp4HozUG3jeFsdUKw8M	f41fdbf6-213b-47ad-9054-d8f5c71afdd9	2026-04-11 13:30:30.897768+00	\N
974dd741-84fd-43ec-b7ce-84f48a423a4f	vaisQwXxlVH6v2xSrRjbHgmPwy6qIN41omywdgfCrY8	9a7ed03e-207c-4e4e-937d-c98796eda986	2026-04-11 14:10:55.05252+00	\N
43ff05a7-5c2b-488d-8a5b-250a68870055	VDZZGhm1ck6QLTg2PkOsgM4XCiU7VOhjnYmJ8dGOOxg	6971c7df-2acb-41e3-bda7-c3677754455f	2026-04-11 14:11:31.539658+00	\N
de24e89a-ee9c-4164-8f91-c9fa334de2c2	1H3jAfxidwTfJfxn2h6czZ-8tnovpz5fH5phCR4M-Rc	f8fa7bc5-e05e-4754-a559-2a15b19a4390	2026-04-11 14:13:51.18987+00	\N
b68eb037-2758-474a-a9ea-943572c7241c	v3467G6SxVo6cHd_30IqvxMgGUZwxSTvirwWaD95kDA	6971c7df-2acb-41e3-bda7-c3677754455f	2026-04-11 14:28:57.348689+00	\N
d4090bde-d440-42d3-a7a5-31109c52973e	Vb3LWQjLCyt8fNIbiLThUXdQDQocobhLxIk4WxvBQkM	f8fa7bc5-e05e-4754-a559-2a15b19a4390	2026-04-11 14:47:34.88197+00	\N
338eba5b-7326-42e2-adaa-b9f3e9fb29fd	2rE-SEtUmF66fWvwTZIkDoZklzBAuccwx72h... (479 KB left)
