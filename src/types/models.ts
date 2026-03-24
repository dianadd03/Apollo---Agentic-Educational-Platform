export type UserRole = "Student" | "Professor";

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
};

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
  stages: AgentStage[];
  confidence: number;
  retries: number;
  status: "Healthy" | "Needs Attention" | "Complete";
  startedAt: string;
  finishedAt: string;
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
