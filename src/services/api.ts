import type { AuthResponse, SearchMaterialsResponse, Topic, TopicDetail, TopicLevel, User } from "@/types/models";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";
const TOKEN_STORAGE_KEY = "apollo-library-token";

function getToken() {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function storeToken(token: string) {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

async function apiFetch<T>(path: string, init: RequestInit = {}, auth = false): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");

  if (auth) {
    const token = getToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message = payload?.detail || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export const api = {
  tokenStorageKey: TOKEN_STORAGE_KEY,
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
    return apiFetch<User>("/api/auth/me", {}, true);
  },
  getTopics() {
    return apiFetch<Topic[]>("/api/topics", {}, true);
  },
  createTopic(title: string, level: TopicLevel) {
    return apiFetch<Topic>("/api/topics", {
      method: "POST",
      body: JSON.stringify({ title, level }),
    }, true);
  },
  getTopic(topicId: string) {
    return apiFetch<TopicDetail>(`/api/topics/${topicId}`, {}, true);
  },
  searchMaterials(topic: string) {
    return apiFetch<SearchMaterialsResponse>("/api/search-materials", {
      method: "POST",
      body: JSON.stringify({ topic }),
    });
  },
};
