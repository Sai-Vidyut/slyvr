import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import axios from "axios";
import { motionToast as toast } from "@/components/ui/motion-toast";

import { queryKeys } from "@/lib/query-keys";
import { getApiErrorMessage } from "@/lib/api-client";
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

export function useCategoriesQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.categories.all,
    queryFn: getCategories,
    enabled,
  });
}

export function usePeopleQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.people.all,
    queryFn: getPeople,
    enabled,
  });
}

export function useClipsQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.clips.all,
    queryFn: getClips,
    enabled,
    select: (data) => data.clips,
  });
}

export function useSearchClipsQuery(params: SearchParams, enabled: boolean) {
  const keyParams = {
    q: params.q,
    person: params.person ?? "",
    category: params.category ?? "",
    device: params.device ?? "",
    year: params.year ?? "",
    location: params.location ?? "",
    file_type: params.file_type ?? "",
  };
  return useQuery({
    queryKey: queryKeys.clips.search(keyParams),
    queryFn: () => searchClips(params),
    enabled: enabled && params.q.trim().length > 0,
  });
}

export function useClipQuery(clipId: number | null, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.clips.detail(clipId ?? 0),
    queryFn: () => getClipById(clipId!),
    enabled: enabled && clipId != null,
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
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateClipPayload }) =>
      updateClip(id, data),
    onSuccess: (_data, { id }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.clips.all });
      void qc.invalidateQueries({ queryKey: queryKeys.clips.detail(id) });
      toast.success("Clip saved");
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error));
    },
  });
}

export function useDeleteClipMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteClip(id),
    onSuccess: (_data, id) => {
      qc.removeQueries({ queryKey: queryKeys.clips.detail(id) });
      void qc.invalidateQueries({ queryKey: queryKeys.clips.all });
      toast.success("Clip deleted");
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error));
    },
  });
}

export function useCreateCategoryMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.categories.all });
      toast.success("Category created");
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
}

export function useDeleteCategoryMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.categories.all });
      void qc.invalidateQueries({ queryKey: queryKeys.clips.all });
      toast.success("Category deleted");
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
}

export function useCreatePersonMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createPerson,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.people.all });
      toast.success("Person added");
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
}

export function useDeletePersonMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deletePerson,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.people.all });
      void qc.invalidateQueries({ queryKey: queryKeys.clips.all });
      toast.success("Person removed");
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
}

export function useInvalidateClips() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: queryKeys.clips.all });
  };
}
