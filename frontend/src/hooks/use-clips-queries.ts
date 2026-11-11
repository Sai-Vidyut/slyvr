import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import axios from "axios";
import { motionToast as toast } from "@/components/ui/motion-toast";

import { queryKeys } from "@/lib/query-keys";
import { getApiErrorMessage } from "@/lib/api-client";
import { useLibrary } from "@/providers/library-provider";
import type { UpdateClipPayload, SearchParams } from "@/types/clip";
import {
  createCategory,
  createPerson,
  deleteCategory,
  deleteClip,
  deletePerson,
  getCategories,
  getClipById,
  getClips,
  getHealth,
  getPeople,
  searchClips,
  updateClip,
} from "@/services/api";

export function hasActiveSearchParams(params: SearchParams): boolean {
  if (params.q.trim().length > 0) {
    return true;
  }
  return Boolean(
    params.person ||
      params.category ||
      params.device ||
      params.year ||
      params.location ||
      params.file_type ||
      params.media_kind ||
      params.has_gps === true ||
      params.lens_model ||
      params.video_codec,
  );
}

export function useCategoriesQuery(enabled = true) {
  const { activeLibraryId } = useLibrary();
  return useQuery({
    queryKey: queryKeys.categories.all(activeLibraryId),
    queryFn: getCategories,
    enabled: enabled && activeLibraryId != null,
  });
}

export function usePeopleQuery(enabled = true) {
  const { activeLibraryId } = useLibrary();
  return useQuery({
    queryKey: queryKeys.people.all(activeLibraryId),
    queryFn: getPeople,
    enabled: enabled && activeLibraryId != null,
  });
}

export function useClipsQuery(enabled = true) {
  const { activeLibraryId } = useLibrary();
  return useQuery({
    queryKey: queryKeys.clips.all(activeLibraryId),
    queryFn: getClips,
    enabled: enabled && activeLibraryId != null,
    select: (data) => data.clips,
  });
}

export function useSearchClipsQuery(params: SearchParams, enabled: boolean) {
  const { activeLibraryId } = useLibrary();
  const keyParams = {
    q: params.q,
    person: params.person ?? "",
    category: params.category ?? "",
    device: params.device ?? "",
    year: params.year ?? "",
    location: params.location ?? "",
    file_type: params.file_type ?? "",
    media_kind: params.media_kind ?? "",
    has_gps: params.has_gps === true ? "1" : "",
    lens_model: params.lens_model ?? "",
    video_codec: params.video_codec ?? "",
  };
  return useQuery({
    queryKey: queryKeys.clips.search(activeLibraryId, keyParams),
    queryFn: () => searchClips(params),
    enabled:
      enabled && activeLibraryId != null && hasActiveSearchParams(params),
  });
}

export function useClipQuery(clipId: number | null, enabled: boolean) {
  const { activeLibraryId } = useLibrary();
  return useQuery({
    queryKey: queryKeys.clips.detail(activeLibraryId, clipId ?? 0),
    queryFn: () => getClipById(clipId!),
    enabled: enabled && activeLibraryId != null && clipId != null,
    retry: (count, error) => {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return false;
      }
      return count < 1;
    },
  });
}

export function useHealthQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.health,
    queryFn: getHealth,
    enabled,
    staleTime: 60_000,
    refetchInterval: enabled ? 120_000 : false,
    refetchOnWindowFocus: enabled,
    retry: enabled ? 1 : 0,
  });
}

export function useUpdateClipMutation() {
  const qc = useQueryClient();
  const { activeLibraryId } = useLibrary();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateClipPayload }) =>
      updateClip(id, data),
    onSuccess: (_data, { id }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.clips.all(activeLibraryId) });
      void qc.invalidateQueries({
        queryKey: queryKeys.clips.detail(activeLibraryId, id),
      });
      toast.success("Clip saved");
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error));
    },
  });
}

export function useDeleteClipMutation() {
  const qc = useQueryClient();
  const { activeLibraryId } = useLibrary();
  return useMutation({
    mutationFn: (id: number) => deleteClip(id),
    onSuccess: (_data, id) => {
      qc.removeQueries({
        queryKey: queryKeys.clips.detail(activeLibraryId, id),
      });
      void qc.invalidateQueries({ queryKey: queryKeys.clips.all(activeLibraryId) });
      toast.success("Clip deleted");
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error));
    },
  });
}

export function useCreateCategoryMutation() {
  const qc = useQueryClient();
  const { activeLibraryId } = useLibrary();
  return useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: queryKeys.categories.all(activeLibraryId),
      });
      toast.success("Category created");
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
}

export function useDeleteCategoryMutation() {
  const qc = useQueryClient();
  const { activeLibraryId } = useLibrary();
  return useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: queryKeys.categories.all(activeLibraryId),
      });
      void qc.invalidateQueries({ queryKey: queryKeys.clips.all(activeLibraryId) });
      toast.success("Category deleted");
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
}

export function useCreatePersonMutation() {
  const qc = useQueryClient();
  const { activeLibraryId } = useLibrary();
  return useMutation({
    mutationFn: createPerson,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.people.all(activeLibraryId) });
      toast.success("Person added");
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
}

export function useDeletePersonMutation() {
  const qc = useQueryClient();
  const { activeLibraryId } = useLibrary();
  return useMutation({
    mutationFn: deletePerson,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.people.all(activeLibraryId) });
      void qc.invalidateQueries({ queryKey: queryKeys.clips.all(activeLibraryId) });
      toast.success("Person removed");
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
}

export function useInvalidateClips() {
  const qc = useQueryClient();
  const { activeLibraryId } = useLibrary();
  return () => {
    void qc.invalidateQueries({ queryKey: queryKeys.clips.all(activeLibraryId) });
  };
}
