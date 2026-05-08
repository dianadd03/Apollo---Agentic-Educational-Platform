import type { AuthResponse, ManagedMaterialResponse, SavedSearchResultResponse, SearchMaterialsResponse, Topic, TopicDetail, TopicLevel, UploadedMaterialResponse, User, UserRole } from "@/types/models";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";
const TOKEN_STORAGE_KEY = "apollo-library-token";

function getToken() {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function storeToken(token: string) {
  if (!token) {
    throw new Error("Authentication token missing from server response.");
  }
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

async function apiFetch<T>(path: string, init: RequestInit = {}, auth = false): Promise<T> {
  const headers = new Headers(init.headers);
  if (!(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

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

  if (response.status === 204) {
    return undefined as T;
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
  register(name: string, email: string, password: string, role: UserRole = "student") {
    return apiFetch<AuthResponse>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password, role }),
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
  deleteTopic(topicId: string) {
    return apiFetch<void>(`/api/topics/${topicId}`, {
      method: "DELETE",
    }, true);
  },
  searchMaterials(topic: string, maxResults?: number) {
    return apiFetch<SearchMaterialsResponse>("/api/search-materials", {
      method: "POST",
      body: JSON.stringify({ topic, max_results: maxResults }),
    }, true);
  },
  getSearchHistory(topic: string, limit = 10) {
    const params = new URLSearchParams({ topic, limit: String(limit) });
    return apiFetch<SavedSearchResultResponse[]>(`/api/search-materials/history?${params.toString()}`, {}, true);
  },
  uploadMaterial(formData: FormData) {
    return apiFetch<UploadedMaterialResponse>("/api/materials/upload", {
      method: "POST",
      body: formData,
    }, true);
  },
  getManagedMaterials() {
    return apiFetch<ManagedMaterialResponse[]>("/api/materials/managed", {}, true);
  },
  verifyMaterial(materialId: string, verified: boolean) {
    return apiFetch<ManagedMaterialResponse>(`/api/materials/${materialId}/verify`, {
      method: "PATCH",
      body: JSON.stringify({ verified }),
    }, true);
  },
  setMaterialActive(materialId: string, isActive: boolean) {
    return apiFetch<ManagedMaterialResponse>(`/api/materials/${materialId}/active`, {
      method: "PATCH",
      body: JSON.stringify({ is_active: isActive }),
    }, true);
  },
};
