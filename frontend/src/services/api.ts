import type {
  Category,
  Clip,
  ClipListResponse,
  HealthResponse,
  Person,
  SearchParams,
  SearchResponse,
  UpdateClipPayload,
} from "@/types/clip";
import type {
  CreateWorkspaceResponse,
  JoinCodeResponse,
  LibrarySummary,
  MeResponse,
  WorkspaceResponse,
} from "@/types/library";
import { apiClient } from "@/lib/api-client";

export const getClips = async (): Promise<ClipListResponse> => {
  const response = await apiClient.get<ClipListResponse>("/clips");
  return response.data;
};

export const getClipById = async (id: number): Promise<Clip> => {
  const response = await apiClient.get<Clip>(`/clips/${id}`);
  return response.data;
};

export type ClipReadUrlResponse = {
  url: string;
  expires_at: string;
};

export const getClipReadUrl = async (
  id: number,
  purpose: "media" | "thumbnail",
): Promise<ClipReadUrlResponse> => {
  const response = await apiClient.get<ClipReadUrlResponse>(
    `/clips/${id}/read-url`,
    { params: { purpose } },
  );
  return response.data;
};

export const searchClips = async (params: SearchParams): Promise<SearchResponse> => {
  const response = await apiClient.get<SearchResponse>("/clips/search", {
    params: {
      q: params.q,
      person: params.person || undefined,
      category: params.category || undefined,
      device: params.device || undefined,
      year: params.year || undefined,
      location: params.location || undefined,
      file_type: params.file_type || undefined,
    },
  });
  return response.data;
};

export const deleteClip = async (id: number) => {
  const response = await apiClient.delete(`/clips/${id}`);
  return response.data;
};

export const updateClip = async (id: number, data: UpdateClipPayload) => {
  const response = await apiClient.put(`/clips/${id}`, data);
  return response.data;
};

export const getCategories = async (): Promise<Category[]> => {
  const response = await apiClient.get<Category[]>("/categories/all");
  return response.data;
};

export const createCategory = async (name: string): Promise<Category> => {
  const response = await apiClient.post<Category>("/categories", { name });
  return response.data;
};

export const deleteCategory = async (name: string) => {
  const response = await apiClient.delete(
    `/categories/by-name/${encodeURIComponent(name)}`,
  );
  return response.data;
};

export const getPeople = async (): Promise<Person[]> => {
  const response = await apiClient.get<Person[]>("/people");
  return response.data;
};

export const createPerson = async (name: string): Promise<Person> => {
  const response = await apiClient.post<Person>("/people", { name });
  return response.data;
};

export const deletePerson = async (name: string) => {
  const response = await apiClient.delete(
    `/people/by-name/${encodeURIComponent(name)}`,
  );
  return response.data;
};

export const getHealth = async (): Promise<HealthResponse> => {
  const response = await apiClient.get<HealthResponse>("/health");
  return response.data;
};

export const uploadClip = (
  formData: FormData,
  onUploadProgress?: (percent: number) => void,
) =>
  apiClient.post("/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (progressEvent) => {
      if (!onUploadProgress) return;
      const total = progressEvent.total;
      if (!total || total <= 0) return;
      const percent = Math.round((progressEvent.loaded * 100) / total);
      onUploadProgress(percent);
    },
  });

export const getMe = async (): Promise<MeResponse> => {
  const response = await apiClient.get<MeResponse>("/me");
  return response.data;
};

export const getMyLibraries = async (): Promise<LibrarySummary[]> => {
  const response = await apiClient.get<LibrarySummary[]>("/me/libraries");
  return response.data;
};

export const createWorkspace = async (
  name: string,
): Promise<CreateWorkspaceResponse> => {
  const response = await apiClient.post<CreateWorkspaceResponse>("/workspaces", {
    name,
  });
  return response.data;
};

export const joinWorkspace = async (code: string): Promise<WorkspaceResponse> => {
  const response = await apiClient.post<WorkspaceResponse>("/workspaces/join", {
    code,
  });
  return response.data;
};

export const regenerateJoinCode = async (
  workspaceId: number,
): Promise<JoinCodeResponse> => {
  const response = await apiClient.post<JoinCodeResponse>(
    `/workspaces/${workspaceId}/join-code/regenerate`,
  );
  return response.data;
};

export const revokeJoinCode = async (
  workspaceId: number,
): Promise<JoinCodeResponse> => {
  const response = await apiClient.post<JoinCodeResponse>(
    `/workspaces/${workspaceId}/join-code/revoke`,
  );
  return response.data;
};

export default apiClient;
