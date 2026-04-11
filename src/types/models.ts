export type UserRole = "student" | "professor" | "admin";

export type TopicLevel = "beginner" | "intermediate" | "advanced";
export type MaterialKind = "article" | "video" | "book" | "documentation" | "tutorial" | "pdf" | "course" | "other";

export type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  created_at: string;
};

export type AuthResponse = {
  token: string;
  user: User;
};

export type Topic = {
  id: string;
  title: string;
  level: TopicLevel;
  created_at: string;
  user_id: string;
};

export type SearchResult = {
  material_id?: string | null;
  title: string;
  url: string;
  type: "video" | "article" | "book" | "documentation" | "tutorial" | "other";
  source: string;
  snippet: string;
  reason_for_inclusion: string;
  confidence: number;
  score?: number | null;
  like_count?: number;
  user_has_liked?: boolean;
  is_verified?: boolean;
  is_internal?: boolean;
  source_of_result?: string;
};

export type TopicDetail = Topic & {
  learning_materials: SearchResult[];
  roadmap: string[];
  exercises: string[];
  coding_tasks: string[];
};

export type SearchMaterialsResponse = {
  topic: string;
  topic_id?: string | null;
  query_used: string;
  results: SearchResult[];
  search_metadata: {
    timestamp: string;
    total_results: number;
    notes: string;
    coverage_source?: "db_internal" | "db_internal_with_web_fallback" | "web_only" | "cached";
    search_result_id?: string | null;
  };
};

export type Material = {
  id: string;
  title: string;
  url: string;
  source: string;
  format: "video" | "article" | "book" | "site";
  difficulty: number;
  topicWeights: Record<string, number>;
  prerequisites: string[];
  validationStatus: "Validated" | "Pending" | "Needs Review";
  qualityScore: number;
  relevanceScore: number;
  recommendationReason: string;
  provenanceType: "internal" | "web";
  confidence: number;
  snippet?: string;
  candidateType?: "video" | "article" | "book" | "documentation" | "tutorial" | "other";
};

export type UploadedMaterialResponse = {
  id: string;
  canonical_name: string;
  link: string | null;
  file_path: string | null;
  material_type: MaterialKind;
  difficulty: TopicLevel;
  source_type: string;
  trust_score: number;
  quality_score: number;
  ease_score: number;
  summary: string | null;
  is_published: boolean;
  is_active: boolean;
  is_verified: boolean;
  like_count: number;
  user_has_liked: boolean;
  tags: string[];
  topics: Array<{ id: string; title: string; slug: string }>;
  created_at?: string | null;
  updated_at?: string | null;
};

export type ManagedMaterialResponse = UploadedMaterialResponse;

export type Problem = {
  id: string;
  title: string;
  url: string;
  source: "Codeforces" | "LeetCode" | "AtCoder" | "General Problems";
  difficulty: "Easy" | "Medium" | "Hard";
  successRate: number;
  topicMatch: number;
  generated: boolean;
};

export type FoundationalTask = {
  id: string;
  title: string;
  objective: string;
  difficulty: "Intro" | "Core" | "Stretch";
  prerequisites: string[];
  sequenceOrder: number;
  generatedFromTopic: string;
  whyInSequence: string;
};

export type ReviewFinding = {
  id: string;
  title: string;
  detail: string;
  lineStart: number;
  lineEnd: number;
};

export type CodeReview = {
  id: string;
  topic: string;
  taskTitle: string;
  language: "TypeScript" | "Python" | "C++";
  code: string;
  findings: {
    bugs: ReviewFinding[];
    edgeCases: ReviewFinding[];
    optimizations: ReviewFinding[];
    style: ReviewFinding[];
  };
  stale: boolean;
  createdAt: string;
};

export type AgentStage = {
  id: string;
  name:
    | "Retrieval"
    | "Web fallback"
    | "Validation"
    | "Ranking"
    | "Task generation"
    | "Problem aggregation"
    | "Review analysis";
  status: "Completed" | "Running" | "Queued" | "Retrying" | "Failed";
  timestamp: string;
  confidence: number;
  retries: number;
  notes: string;
};

export type AgentRun = {
  id: string;
  query: string;
  confidence: number;
  retries: number;
  status: "Healthy" | "Needs Attention" | "Complete";
  startedAt: string;
  finishedAt: string;
  stages: AgentStage[];
};

export type TopicWorkspaceData = {
  topic: string;
  searchMode: "internal" | "web-fallback" | "refinement" | "empty";
  summary: string;
  materials: Material[];
  problems: Problem[];
  tasks: FoundationalTask[];
  review: CodeReview;
  run: AgentRun;
};
