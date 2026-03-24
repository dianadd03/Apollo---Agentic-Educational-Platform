import type {
  AgentRun,
  CodeReview,
  FoundationalTask,
  Material,
  Problem,
  TopicWorkspaceData,
} from "@/types/models";

const graphMaterials: Material[] = [
  {
    id: "mat-g-1",
    title: "Graph Theory Essentials for Competitive Programming",
    url: "https://apollo.internal/materials/graph-theory-essentials",
    source: "Apollo Library",
    format: "article",
    difficulty: 4,
    topicWeights: { Graphs: 0.92, BFS: 0.71 },
    prerequisites: ["Arrays", "Queues"],
    validationStatus: "Validated",
    qualityScore: 96,
    relevanceScore: 94,
    recommendationReason: "Strong conceptual primer before traversals and shortest-path algorithms.",
    provenanceType: "internal",
    confidence: 0.97,
  },
  {
    id: "mat-g-2",
    title: "Shortest Paths: Dijkstra, Bellman-Ford, and Tradeoffs",
    url: "https://cp-algorithms.com/graph/dijkstra.html",
    source: "CP-Algorithms",
    format: "site",
    difficulty: 6,
    topicWeights: { Graphs: 0.9, Dijkstra: 0.86 },
    prerequisites: ["Priority Queue", "Weighted Graphs"],
    validationStatus: "Validated",
    qualityScore: 93,
    relevanceScore: 92,
    recommendationReason: "Pairs well with task sequencing and gives implementation-level detail.",
    provenanceType: "web",
    confidence: 0.93,
  },
  {
    id: "mat-g-3",
    title: "Visual BFS and DFS Walkthrough",
    url: "https://www.youtube.com/watch?v=09_LlHjoEiY",
    source: "freeCodeCamp",
    format: "video",
    difficulty: 3,
    topicWeights: { Graphs: 0.81, DFS: 0.78 },
    prerequisites: ["Arrays"],
    validationStatus: "Validated",
    qualityScore: 88,
    relevanceScore: 85,
    recommendationReason: "Good for learners who need mental models before coding.",
    provenanceType: "web",
    confidence: 0.91,
  },
  {
    id: "mat-g-4",
    title: "Advanced Graph Interview Patterns",
    url: "https://apollo.internal/materials/graph-interview-patterns",
    source: "Apollo Faculty Notes",
    format: "book",
    difficulty: 8,
    topicWeights: { Graphs: 0.87, TopologicalSort: 0.75 },
    prerequisites: ["DFS", "Hash Maps"],
    validationStatus: "Needs Review",
    qualityScore: 79,
    relevanceScore: 82,
    recommendationReason: "Rich pattern coverage, but examples need metadata cleanup.",
    provenanceType: "internal",
    confidence: 0.61,
  },
];

const graphProblems: Problem[] = [
  {
    id: "prob-g-1",
    title: "Breadth First Search",
    url: "https://codeforces.com/problemset/problem/103/B",
    source: "Codeforces",
    difficulty: "Easy",
    successRate: 74,
    topicMatch: 91,
    generated: false,
  },
  {
    id: "prob-g-2",
    title: "Number of Islands",
    url: "https://leetcode.com/problems/number-of-islands/",
    source: "LeetCode",
    difficulty: "Medium",
    successRate: 59,
    topicMatch: 94,
    generated: false,
  },
  {
    id: "prob-g-3",
    title: "Shortest Path",
    url: "https://atcoder.jp/contests/abc340/tasks/abc340_d",
    source: "AtCoder",
    difficulty: "Medium",
    successRate: 46,
    topicMatch: 88,
    generated: false,
  },
  {
    id: "prob-g-4",
    title: "Campus Shuttle Routing",
    url: "https://apollo.internal/problems/campus-shuttle-routing",
    source: "General Problems",
    difficulty: "Medium",
    successRate: 38,
    topicMatch: 86,
    generated: true,
  },
];

const graphTasks: FoundationalTask[] = [
  {
    id: "task-g-1",
    title: "Implement BFS with parent reconstruction",
    objective: "Traverse an unweighted graph and recover the shortest path tree from a source node.",
    difficulty: "Intro",
    prerequisites: ["Queues", "Adjacency list"],
    sequenceOrder: 1,
    generatedFromTopic: "Graphs",
    whyInSequence: "It creates the traversal foundation needed before shortest path and cycle detection tasks.",
  },
  {
    id: "task-g-2",
    title: "Implement DFS recursively with cycle detection",
    objective: "Track visitation states to detect back-edges in directed graphs.",
    difficulty: "Core",
    prerequisites: ["Recursion", "Adjacency list"],
    sequenceOrder: 2,
    generatedFromTopic: "Graphs",
    whyInSequence: "Introduces recursion and visitation-state patterns used by topological sorting.",
  },
  {
    id: "task-g-3",
    title: "Implement Dijkstra with adjacency list",
    objective: "Use a min-heap to compute shortest paths over sparse weighted graphs.",
    difficulty: "Stretch",
    prerequisites: ["Priority Queue", "BFS intuition"],
    sequenceOrder: 3,
    generatedFromTopic: "Graphs",
    whyInSequence: "Moves from traversal to optimization once the learner is comfortable with graph representations.",
  },
];

const graphReview: CodeReview = {
  id: "rev-g-1",
  topic: "Graphs",
  taskTitle: "Implement BFS with parent reconstruction",
  language: "TypeScript",
  code: `function bfs(graph: number[][], start: number) {
  const queue = [start];
  const visited = new Set<number>();
  const parent = new Map<number, number>();

  while (queue.length) {
    const node = queue.pop();
    if (node === undefined) continue;

    visited.add(node);

    for (const next of graph[node]) {
      if (!visited.has(next)) {
        parent.set(next, node);
        queue.push(next);
      }
    }
  }

  return parent;
}`,
  findings: {
    bugs: [
      {
        id: "bug-1",
        title: "Queue uses LIFO order",
        detail: "Using pop() turns the traversal into DFS-like behavior and breaks shortest-path guarantees.",
        lineStart: 6,
        lineEnd: 6,
      },
    ],
    edgeCases: [
      {
        id: "edge-1",
        title: "Visited set updates too late",
        detail: "A node can be enqueued multiple times before it is marked visited, which inflates work on dense graphs.",
        lineStart: 9,
        lineEnd: 14,
      },
    ],
    optimizations: [
      {
        id: "opt-1",
        title: "Shift cost can be avoided",
        detail: "If you switch to FIFO semantics, use an index pointer instead of shift() to keep queue operations O(1).",
        lineStart: 2,
        lineEnd: 7,
      },
    ],
    style: [
      {
        id: "style-1",
        title: "Return structure is partial",
        detail: "Include the visited set or a path helper to make the utility easier to reuse in tasks and tests.",
        lineStart: 17,
        lineEnd: 17,
      },
    ],
  },
  stale: false,
  createdAt: "2026-03-24T10:05:00Z",
};

const dpMaterials: Material[] = [
  {
    id: "mat-d-1",
    title: "Dynamic Programming State Design Cheatsheet",
    url: "https://apollo.internal/materials/dp-state-design",
    source: "Apollo Library",
    format: "article",
    difficulty: 6,
    topicWeights: { "Dynamic Programming": 0.96 },
    prerequisites: ["Recursion", "Complexity analysis"],
    validationStatus: "Validated",
    qualityScore: 95,
    relevanceScore: 96,
    recommendationReason: "Internal note set already aligned to your curriculum taxonomy.",
    provenanceType: "internal",
    confidence: 0.96,
  },
  {
    id: "mat-d-2",
    title: "Top-Down and Bottom-Up DP Patterns",
    url: "https://www.geeksforgeeks.org/dynamic-programming/",
    source: "GeeksforGeeks",
    format: "site",
    difficulty: 5,
    topicWeights: { "Dynamic Programming": 0.88 },
    prerequisites: ["Arrays", "Recursion"],
    validationStatus: "Validated",
    qualityScore: 84,
    relevanceScore: 89,
    recommendationReason: "Added during web fallback because the internal set lacked worked examples.",
    provenanceType: "web",
    confidence: 0.9,
  },
  {
    id: "mat-d-3",
    title: "Knapsack Variants and Transition Tables",
    url: "https://apollo.internal/materials/knapsack-variants",
    source: "Apollo Faculty Notes",
    format: "article",
    difficulty: 7,
    topicWeights: { "Dynamic Programming": 0.91, Knapsack: 0.83 },
    prerequisites: ["State transitions", "Loop invariants"],
    validationStatus: "Pending",
    qualityScore: 81,
    relevanceScore: 86,
    recommendationReason: "Useful but still awaiting secondary agent verification on difficulty labeling.",
    provenanceType: "internal",
    confidence: 0.72,
  },
];

const dpProblems: Problem[] = [
  {
    id: "prob-d-1",
    title: "Climbing Stairs",
    url: "https://leetcode.com/problems/climbing-stairs/",
    source: "LeetCode",
    difficulty: "Easy",
    successRate: 53,
    topicMatch: 84,
    generated: false,
  },
  {
    id: "prob-d-2",
    title: "Vacation",
    url: "https://atcoder.jp/contests/dp/tasks/dp_c",
    source: "AtCoder",
    difficulty: "Medium",
    successRate: 48,
    topicMatch: 92,
    generated: false,
  },
  {
    id: "prob-d-3",
    title: "Educational DP Warmup Sequence",
    url: "https://apollo.internal/problems/dp-warmup-sequence",
    source: "General Problems",
    difficulty: "Medium",
    successRate: 41,
    topicMatch: 88,
    generated: true,
  },
];

const dpTasks: FoundationalTask[] = [
  {
    id: "task-d-1",
    title: "Build memoized Fibonacci",
    objective: "Contrast brute force recursion with memoization and measure the difference in call counts.",
    difficulty: "Intro",
    prerequisites: ["Recursion"],
    sequenceOrder: 1,
    generatedFromTopic: "Dynamic Programming",
    whyInSequence: "It establishes overlapping subproblems before introducing state design.",
  },
  {
    id: "task-d-2",
    title: "Implement 0/1 Knapsack tabulation",
    objective: "Translate a state transition into a 2D table and explain the loop ordering.",
    difficulty: "Core",
    prerequisites: ["Arrays", "State definition"],
    sequenceOrder: 2,
    generatedFromTopic: "Dynamic Programming",
    whyInSequence: "Moves the learner from recursion intuition to explicit table construction.",
  },
];

const dpReview: CodeReview = {
  id: "rev-d-1",
  topic: "Dynamic Programming",
  taskTitle: "Build memoized Fibonacci",
  language: "Python",
  code: `def fib(n, memo={}):
    if n <= 1:
        return n
    if n in memo:
        return memo[n]
    memo[n] = fib(n - 1) + fib(n - 2)
    return memo[n]
`,
  findings: {
    bugs: [
      {
        id: "bug-d-1",
        title: "Shared mutable default memo",
        detail: "The default dictionary persists across calls, which can leak cached state between tests.",
        lineStart: 1,
        lineEnd: 1,
      },
    ],
    edgeCases: [],
    optimizations: [
      {
        id: "opt-d-1",
        title: "Pass memo into recursive calls",
        detail: "Without forwarding memo, recursive branches allocate fresh caches and lose the intended speedup.",
        lineStart: 6,
        lineEnd: 6,
      },
    ],
    style: [],
  },
  stale: false,
  createdAt: "2026-03-24T09:35:00Z",
};

const mlMaterials: Material[] = [
  {
    id: "mat-m-1",
    title: "Supervised Learning Foundations",
    url: "https://apollo.internal/materials/supervised-learning-foundations",
    source: "Apollo Library",
    format: "article",
    difficulty: 5,
    topicWeights: { "Machine Learning": 0.83 },
    prerequisites: ["Probability", "Linear algebra"],
    validationStatus: "Pending",
    qualityScore: 78,
    relevanceScore: 74,
    recommendationReason: "The query was broad, so the system kept a general primer while refinement is running.",
    provenanceType: "internal",
    confidence: 0.69,
  },
  {
    id: "mat-m-2",
    title: "Hands-On Introduction to Model Evaluation",
    url: "https://www.coursera.org/learn/machine-learning",
    source: "Coursera",
    format: "site",
    difficulty: 4,
    topicWeights: { "Machine Learning": 0.71 },
    prerequisites: ["Python basics"],
    validationStatus: "Needs Review",
    qualityScore: 73,
    relevanceScore: 71,
    recommendationReason: "Secondary agent flagged the topic scope as too broad for confident ranking.",
    provenanceType: "web",
    confidence: 0.58,
  },
];

const mlProblems: Problem[] = [
  {
    id: "prob-m-1",
    title: "Feature Scaling Diagnostics",
    url: "https://apollo.internal/problems/feature-scaling-diagnostics",
    source: "General Problems",
    difficulty: "Easy",
    successRate: 44,
    topicMatch: 66,
    generated: true,
  },
];

const mlTasks: FoundationalTask[] = [
  {
    id: "task-m-1",
    title: "Implement train/test split from scratch",
    objective: "Create a deterministic dataset split helper and inspect class imbalance.",
    difficulty: "Intro",
    prerequisites: ["Python", "Arrays"],
    sequenceOrder: 1,
    generatedFromTopic: "Machine Learning",
    whyInSequence: "The agent selected an implementation task while it waits for the topic to be narrowed.",
  },
];

const mlReview: CodeReview = {
  id: "rev-m-1",
  topic: "Machine Learning",
  taskTitle: "Implement train/test split from scratch",
  language: "Python",
  code: "",
  findings: {
    bugs: [],
    edgeCases: [],
    optimizations: [],
    style: [],
  },
  stale: false,
  createdAt: "2026-03-24T08:20:00Z",
};

const makeRun = (
  id: string,
  query: string,
  status: AgentRun["status"],
  confidence: number,
  retries: number,
  stages: AgentRun["stages"],
): AgentRun => ({
  id,
  query,
  stages,
  confidence,
  retries,
  status,
  startedAt: "2026-03-24 11:02",
  finishedAt: "2026-03-24 11:03",
});

export const topicWorkspaces: TopicWorkspaceData[] = [
  {
    topic: "Graphs",
    searchMode: "internal",
    summary: "Apollo found a high-confidence internal learning path and supplemented it with only a few external references.",
    materials: graphMaterials,
    problems: graphProblems,
    tasks: graphTasks,
    review: graphReview,
    run: makeRun("run-g", "Graphs", "Complete", 0.94, 0, [
      { id: "g1", name: "Retrieval", status: "Completed", timestamp: "11:02:04", confidence: 0.97, retries: 0, notes: "12 internal graph resources matched curriculum tags." },
      { id: "g2", name: "Web fallback", status: "Completed", timestamp: "11:02:11", confidence: 0.78, retries: 0, notes: "Fallback used only for implementation-heavy references." },
      { id: "g3", name: "Validation", status: "Completed", timestamp: "11:02:17", confidence: 0.92, retries: 0, notes: "Secondary agent downgraded one interview-pattern note set." },
      { id: "g4", name: "Ranking", status: "Completed", timestamp: "11:02:22", confidence: 0.95, retries: 0, notes: "Difficulty ordering optimized for sophomore CS learners." },
      { id: "g5", name: "Task generation", status: "Completed", timestamp: "11:02:27", confidence: 0.93, retries: 0, notes: "Three implementation tasks generated from traversal mastery." },
      { id: "g6", name: "Problem aggregation", status: "Completed", timestamp: "11:02:31", confidence: 0.9, retries: 0, notes: "Problems deduplicated across Codeforces and LeetCode." },
      { id: "g7", name: "Review analysis", status: "Completed", timestamp: "11:02:36", confidence: 0.91, retries: 0, notes: "Existing BFS submission indexed for quick review reuse." },
    ]),
  },
  {
    topic: "Dynamic Programming",
    searchMode: "web-fallback",
    summary: "Apollo found good internal fundamentals, then triggered web fallback to widen the worked-example set.",
    materials: dpMaterials,
    problems: dpProblems,
    tasks: dpTasks,
    review: dpReview,
    run: makeRun("run-d", "Dynamic Programming", "Complete", 0.87, 1, [
      { id: "d1", name: "Retrieval", status: "Completed", timestamp: "10:49:02", confidence: 0.82, retries: 0, notes: "Only three internal matches had worked examples." },
      { id: "d2", name: "Web fallback", status: "Completed", timestamp: "10:49:11", confidence: 0.84, retries: 0, notes: "Fallback expanded example coverage with tutorial-style resources." },
      { id: "d3", name: "Validation", status: "Retrying", timestamp: "10:49:19", confidence: 0.69, retries: 1, notes: "One note set had uncertain difficulty labels and required a second pass." },
      { id: "d4", name: "Ranking", status: "Completed", timestamp: "10:49:26", confidence: 0.88, retries: 0, notes: "Sequenced from recursion intuition toward tabulation." },
      { id: "d5", name: "Task generation", status: "Completed", timestamp: "10:49:34", confidence: 0.9, retries: 0, notes: "Tasks emphasize state design and transition reasoning." },
      { id: "d6", name: "Problem aggregation", status: "Completed", timestamp: "10:49:38", confidence: 0.86, retries: 0, notes: "One AI-generated warmup problem included to bridge difficulty." },
      { id: "d7", name: "Review analysis", status: "Completed", timestamp: "10:49:44", confidence: 0.89, retries: 0, notes: "Memoization review template attached to workspace." },
    ]),
  },
  {
    topic: "Machine Learning",
    searchMode: "refinement",
    summary: "The query is broad, so Apollo returned a provisional path, highlighted low-confidence items, and queued refinement.",
    materials: mlMaterials,
    problems: mlProblems,
    tasks: mlTasks,
    review: mlReview,
    run: makeRun("run-m", "Machine Learning", "Needs Attention", 0.64, 2, [
      { id: "m1", name: "Retrieval", status: "Completed", timestamp: "09:12:02", confidence: 0.76, retries: 0, notes: "Broad topic produced multiple sub-domain clusters." },
      { id: "m2", name: "Web fallback", status: "Completed", timestamp: "09:12:12", confidence: 0.67, retries: 0, notes: "Fallback added beginner-friendly survey resources." },
      { id: "m3", name: "Validation", status: "Failed", timestamp: "09:12:25", confidence: 0.41, retries: 2, notes: "Validation agent requested narrower scope such as supervised learning or neural networks." },
      { id: "m4", name: "Ranking", status: "Queued", timestamp: "09:12:25", confidence: 0.0, retries: 0, notes: "Waiting for a refined query." },
      { id: "m5", name: "Task generation", status: "Completed", timestamp: "09:12:32", confidence: 0.62, retries: 0, notes: "Generated one lightweight implementation task while waiting." },
      { id: "m6", name: "Problem aggregation", status: "Completed", timestamp: "09:12:36", confidence: 0.58, retries: 0, notes: "Only AI-generated general problems were relevant at this scope." },
      { id: "m7", name: "Review analysis", status: "Queued", timestamp: "09:12:40", confidence: 0.0, retries: 0, notes: "No submission attached yet." },
    ]),
  },
];

export const suggestedTopics = [
  "Graphs",
  "Dynamic Programming",
  "Backtracking",
  "Machine Learning",
  "Databases",
  "Recursion",
];

export const stats = [
  { label: "Validated materials", value: "1,248", delta: "+9.4% this month" },
  { label: "Problem mappings", value: "8,412", delta: "Across 4 providers" },
  { label: "Average review turnaround", value: "18 sec", delta: "For saved workspaces" },
  { label: "Low-confidence queue", value: "23", delta: "7 need professor approval" },
];

export const savedLearningPaths = [
  { id: "s1", title: "Graphs interview prep", progress: 72, items: 14 },
  { id: "s2", title: "DP foundations", progress: 41, items: 11 },
  { id: "s3", title: "Database indexing", progress: 18, items: 8 },
];

export const emptyWorkspace: TopicWorkspaceData = {
  topic: "Unknown Topic",
  searchMode: "empty",
  summary: "Apollo could not build a confident learning path yet. Try narrowing the topic or using one of the suggestions.",
  materials: [],
  problems: [],
  tasks: [],
  review: {
    id: "empty-review",
    topic: "Unknown Topic",
    taskTitle: "No task selected",
    language: "TypeScript",
    code: "",
    findings: { bugs: [], edgeCases: [], optimizations: [], style: [] },
    stale: false,
    createdAt: "",
  },
  run: makeRun("run-empty", "Unknown Topic", "Needs Attention", 0.22, 1, [
    { id: "e1", name: "Retrieval", status: "Completed", timestamp: "11:10:04", confidence: 0.35, retries: 0, notes: "Few materials matched the query wording." },
    { id: "e2", name: "Web fallback", status: "Completed", timestamp: "11:10:10", confidence: 0.31, retries: 0, notes: "Fallback results were too broad or off-topic." },
    { id: "e3", name: "Validation", status: "Failed", timestamp: "11:10:18", confidence: 0.12, retries: 1, notes: "Secondary agent rejected the candidate set as insufficient." },
    { id: "e4", name: "Ranking", status: "Queued", timestamp: "11:10:18", confidence: 0, retries: 0, notes: "Waiting for a refined topic query." },
    { id: "e5", name: "Task generation", status: "Queued", timestamp: "11:10:18", confidence: 0, retries: 0, notes: "No safe task sequence without better retrieval." },
    { id: "e6", name: "Problem aggregation", status: "Queued", timestamp: "11:10:18", confidence: 0, retries: 0, notes: "No high-quality problem matches available." },
    { id: "e7", name: "Review analysis", status: "Queued", timestamp: "11:10:18", confidence: 0, retries: 0, notes: "No code workspace opened yet." },
  ]),
};

export function findWorkspaceForTopic(query: string) {
  const normalized = query.trim().toLowerCase();
  return (
    topicWorkspaces.find((item) => normalized.includes(item.topic.toLowerCase()) || item.topic.toLowerCase().includes(normalized)) ??
    emptyWorkspace
  );
}

export function collectAdminMaterials() {
  return topicWorkspaces.flatMap((workspace) =>
    workspace.materials.map((material) => ({
      ...material,
      topic: workspace.topic,
      provenanceNotes:
        material.provenanceType === "internal"
          ? "Indexed from the Apollo curriculum library."
          : "Discovered during fallback retrieval and checked by the validator agent.",
      validationNotes:
        material.validationStatus === "Needs Review"
          ? "Confidence below threshold. Needs faculty metadata verification."
          : "Validation agent approved content quality and topic alignment.",
    })),
  );
}

export const initialRecentSearches = ["Graphs", "Dynamic Programming", "Machine Learning"];

export const initialReviewTemplates = [
  { id: "rr1", topic: "Graphs", task: "BFS parent reconstruction", status: "Actionable feedback ready" },
  { id: "rr2", topic: "Dynamic Programming", task: "Memoized Fibonacci", status: "Needs resubmission" },
];
