import type { AgentRun, Material, TopicWorkspaceData } from "@/types/models";
import { emptyWorkspace, findWorkspaceForTopic } from "@/data/mockData";

export type SearchMaterialRequest = {
  topic: string;
  max_results?: number;
};

export type CandidateMaterialResult = {
  title: string;
  url: string;
  type: "video" | "article" | "book" | "documentation" | "tutorial" | "other";
  source: string;
  snippet: string;
  reason_for_inclusion: string;
  confidence: number;
};

export type SearchMaterialsResponse = {
  topic: string;
  query_used: string;
  results: CandidateMaterialResult[];
  search_metadata: {
    timestamp: string;
    total_results: number;
    notes: string;
  };
};

const formatMap: Record<CandidateMaterialResult["type"], Material["format"]> = {
  video: "video",
  article: "article",
  book: "book",
  documentation: "site",
  tutorial: "site",
  other: "site",
};

export async function searchMaterials(payload: SearchMaterialRequest): Promise<SearchMaterialsResponse> {
  const response = await fetch("/api/search-materials", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Search request failed with status ${response.status}`);
  }

  return (await response.json()) as SearchMaterialsResponse;
}

export function buildWorkspaceFromSearch(topic: string, response: SearchMaterialsResponse): TopicWorkspaceData {
  const baseWorkspace = findWorkspaceForTopic(topic);
  const mappedMaterials = response.results.map((item, index) => mapCandidateToMaterial(item, topic, index));
  const notes = response.search_metadata.notes;
  const summary =
    mappedMaterials.length > 0
      ? `${notes} Query used: ${response.query_used}.`
      : "Apollo retrieved no strong candidate materials yet. Try narrowing the topic or retrying with a more specific phrase.";

  return {
    ...(baseWorkspace.topic === "Unknown Topic" ? emptyWorkspace : baseWorkspace),
    topic: response.topic,
    searchMode: mappedMaterials.length > 0 ? "web-fallback" : "empty",
    summary,
    materials: mappedMaterials,
    run: buildSearchRun(response),
  };
}

function mapCandidateToMaterial(item: CandidateMaterialResult, topic: string, index: number): Material {
  const relevanceScore = Math.max(50, Math.round(item.confidence * 100));
  const qualityScore = Math.max(45, Math.round(item.confidence * 100));

  return {
    id: `search-${slugify(topic)}-${index + 1}`,
    title: item.title,
    url: item.url,
    source: item.source,
    format: formatMap[item.type],
    difficulty: inferDifficulty(item),
    topicWeights: { [topic]: item.confidence },
    prerequisites: [],
    validationStatus: "Pending",
    qualityScore,
    relevanceScore,
    recommendationReason: item.reason_for_inclusion,
    provenanceType: "web",
    confidence: item.confidence,
    snippet: item.snippet,
    candidateType: item.type,
  };
}

function buildSearchRun(response: SearchMaterialsResponse): AgentRun {
  const stageNotes =
    response.results.length > 0
      ? `Retrieved ${response.results.length} candidate materials. ${response.search_metadata.notes}`
      : response.search_metadata.notes;

  return {
    id: `run-${slugify(response.topic)}`,
    query: response.query_used,
    confidence: response.results.length ? averageConfidence(response.results) : 0.18,
    retries: 0,
    status: response.results.length ? "Complete" : "Needs Attention",
    startedAt: response.search_metadata.timestamp,
    finishedAt: response.search_metadata.timestamp,
    stages: [
      {
        id: `retrieval-${slugify(response.topic)}`,
        name: "Retrieval",
        status: response.results.length ? "Completed" : "Failed",
        timestamp: response.search_metadata.timestamp,
        confidence: response.results.length ? averageConfidence(response.results) : 0.18,
        retries: 0,
        notes: stageNotes,
      },
      {
        id: `validation-${slugify(response.topic)}`,
        name: "Validation",
        status: "Queued",
        timestamp: response.search_metadata.timestamp,
        confidence: 0,
        retries: 0,
        notes: "Results are ready to be passed to the future review agent for validation.",
      },
      {
        id: `ranking-${slugify(response.topic)}`,
        name: "Ranking",
        status: "Queued",
        timestamp: response.search_metadata.timestamp,
        confidence: 0,
        retries: 0,
        notes: "Final ranking is deferred until review-agent validation is available.",
      },
    ],
  };
}

function inferDifficulty(item: CandidateMaterialResult): number {
  const text = `${item.title} ${item.snippet}`.toLowerCase();
  if (text.includes("introduction") || text.includes("beginner") || text.includes("basics")) return 3;
  if (text.includes("advanced") || text.includes("deep dive")) return 7;
  return 5;
}

function averageConfidence(results: CandidateMaterialResult[]): number {
  const total = results.reduce((sum, item) => sum + item.confidence, 0);
  return Number((total / results.length).toFixed(2));
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
