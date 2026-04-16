import type { AuthResponse, SearchResult, Topic, TopicDetail, TopicLevel, User } from "@/types/models";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";
async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message = payload?.detail || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const api = {
  login(email: string, password: string) {
    return apiFetch<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },
  register(name: string, email: string, password: string) {
    return apiFetch<AuthResponse>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    });
  },
  me() {
    return apiFetch<User>("/api/auth/me");
  },
  logout() {
    return apiFetch<void>("/api/auth/logout", {
      method: "POST",
    });
  },
  getTopics() {
    return apiFetch<Topic[]>("/api/topics");
  },
  createTopic(title: string, level: TopicLevel) {
    return apiFetch<Topic>("/api/topics", {
      method: "POST",
      body: JSON.stringify({ title, level }),
    });
  },
  getTopic(topicId: string) {
    return apiFetch<TopicDetail>(`/api/topics/${topicId}`);
  },
  searchMaterials(topic: string, advanced = false) {
    return apiFetch<SearchResult[]>("/api/search-materials", {
      method: "POST",
      body: JSON.stringify({ topic, advanced }),
    });
  },
};
