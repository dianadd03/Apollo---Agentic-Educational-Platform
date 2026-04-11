import type { AgentRun, Material, TopicWorkspaceData } from "@/types/models";
import { emptyWorkspace, findWorkspaceForTopic } from "@/data/mockData";
import { api } from "@/services/api";

export type SearchMaterialRequest = {
  topic: string;
  max_results?: number;
};

export type CandidateMaterialResult = {
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

export type SearchMaterialsResponse = {
  topic: string;
  topic_id?: string | null;
  query_used: string;
  results: CandidateMaterialResult[];
  search_metadata: {
    timestamp: string;
    total_results: number;
    notes: string;
    coverage_source?: "db_internal" | "db_internal_with_web_fallback" | "web_only" | "cached";
    search_result_id?: string | null;
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
  return api.searchMaterials(payload.topic, payload.max_results);
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
    searchMode:
      response.search_metadata.coverage_source === "db_internal"
        ? "internal"
        : mappedMaterials.length > 0
          ? "web-fallback"
          : "empty",
    summary,
    materials: mappedMaterials,
    run: buildSearchRun(response),
  };
}

function mapCandidateToMaterial(item: CandidateMaterialResult, topic: string, index: number): Material {
  const confidenceBasis = item.score ?? item.confidence;
  const relevanceScore = Math.max(50, Math.round(confidenceBasis * 100));
  const qualityScore = Math.max(45, Math.round(item.confidence * 100));

  return {
    id: item.material_id ?? `search-${slugify(topic)}-${index + 1}`,
    title: item.title,
    url: item.url,
    source: item.source,
    format: formatMap[item.type],
    difficulty: inferDifficulty(item),
    topicWeights: { [topic]: confidenceBasis },
    prerequisites: [],
    validationStatus: item.is_verified ? "Validated" : "Pending",
    qualityScore,
    relevanceScore,
    recommendationReason: item.reason_for_inclusion,
    provenanceType: item.is_internal ? "internal" : "web",
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
        status: response.search_metadata.coverage_source === "db_internal" ? "Completed" : "Queued",
        timestamp: response.search_metadata.timestamp,
        confidence: response.results.length ? averageConfidence(response.results) : 0,
        retries: 0,
        notes:
          response.search_metadata.coverage_source === "db_internal"
            ? "Internal ranking completed from Apollo materials before any web fallback."
            : "Final ranking included web fallback because internal coverage was insufficient.",
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
