import { m } from "framer-motion";
import { Calendar, Camera, Loader2, MapPin, Users } from "lucide-react";
import { useState } from "react";

import { MotionButton } from "@/components/ui/motion-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ClipMetadataSections } from "@/components/clips/ClipMetadataSections";
import {
  useDeleteClipMutation,
  useUpdateClipMutation,
} from "@/hooks/use-clips-queries";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { drawerSectionContainer, fadeUp } from "@/lib/motion";
import type { Category, Clip } from "@/types/clip";

const fieldClass =
  "surface-inset w-full p-3 text-sm text-[var(--clip-fg)] focus:outline-none focus:ring-2 focus:ring-[var(--clip-accent)]/40";

interface ClipInspectorFormProps {
  clip: Clip;
  categories: Category[];
  onDeleted: () => void;
}

export function ClipInspectorForm({
  clip,
  categories,
  onDeleted,
}: ClipInspectorFormProps) {
  const reduced = useReducedMotion();
  const updateMutation = useUpdateClipMutation();
  const deleteMutation = useDeleteClipMutation();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [title, setTitle] = useState(clip.title || "");
  const [description, setDescription] = useState(clip.description || "");
  const [category, setCategory] = useState(clip.category || "");

  const handleSave = async () => {
    await updateMutation.mutateAsync({
      id: clip.id,
      data: { title, description, category },
    });
  };

  const handleConfirmDelete = async () => {
    try {
      await deleteMutation.mutateAsync(clip.id);
      setDeleteOpen(false);
      onDeleted();
    } catch {
      /* toast handled in mutation */
    }
  };

  return (
    <>
      <m.div
        className="space-y-6 p-4 pb-36 md:p-6"
        variants={drawerSectionContainer}
        initial={reduced ? false : "hidden"}
        animate="visible"
      >
        <m.div
          variants={fadeUp}
          className="overflow-hidden rounded-md border border-[var(--clip-border)] bg-black"
        >
          {clip.blob_url ? (
            clip.mime_type?.startsWith("image/") ? (
              <img
                src={clip.blob_url}
                alt=""
                className="max-h-[240px] w-full object-contain md:max-h-[280px]"
              />
            ) : (
              <video
                controls
                preload="metadata"
                className="max-h-[240px] w-full object-contain md:max-h-[280px]"
              >
                <source src={clip.blob_url} type={clip.mime_type || "video/mp4"} />
              </video>
            )
          ) : (
            <p className="py-12 text-center text-meta">Media unavailable</p>
          )}
        </m.div>

        <m.div variants={fadeUp} className="space-y-4">
          <div>
            <label className="mb-2 block text-meta">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={fieldClass}
            />
          </div>
          <div>
            <label className="mb-2 block text-meta">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className={fieldClass}
            />
          </div>
          <div>
            <label htmlFor="clip-category-select" className="mb-2 block text-meta">
              Category
            </label>
            <select
              id="clip-category-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={fieldClass}
            >
              <option value="">Uncategorized</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
              {category &&
                !categories.some((c) => c.name === category) && (
                  <option value={category}>{category}</option>
                )}
            </select>
          </div>
        </m.div>

        {clip.people?.length > 0 && (
          <m.div variants={fadeUp}>
            <p className="mb-2 flex items-center gap-2 text-meta">
              <Users size={14} />
              People
            </p>
            <div className="flex flex-wrap gap-2">
              {clip.people.map((name) => (
                <span
                  key={name}
                  className="rounded-md border border-[var(--clip-border)] bg-[var(--clip-surface)] px-2 py-0.5 text-xs"
                >
                  {name}
                </span>
              ))}
            </div>
          </m.div>
        )}

        <m.div
          variants={fadeUp}
          className="space-y-2 border-t border-[var(--clip-border)] pt-4 text-sm text-[var(--clip-muted)]"
        >
          {clip.camera_model && (
            <div className="flex items-center gap-2">
              <Camera size={16} aria-hidden />
              {[clip.camera_make, clip.camera_model].filter(Boolean).join(" ")}
            </div>
          )}
          {clip.latitude != null && clip.longitude != null && (
            <div className="flex items-center gap-2">
              <MapPin size={16} aria-hidden />
              {clip.latitude.toFixed(4)}, {clip.longitude.toFixed(4)}
            </div>
          )}
          {clip.uploaded_at && (
            <div className="flex items-center gap-2">
              <Calendar size={16} aria-hidden />
              {new Date(clip.uploaded_at).toLocaleString()}
            </div>
          )}
          {clip.file_size != null && clip.file_size > 0 && (
            <p className="text-meta">
              {(clip.file_size / (1024 * 1024)).toFixed(2)} MB
            </p>
          )}
        </m.div>

        <m.div variants={fadeUp}>
          <ClipMetadataSections clip={clip} />
        </m.div>
      </m.div>

      <div className="sticky bottom-0 space-y-2 border-t border-[var(--clip-border)] bg-[var(--clip-bg-elevated)] p-4">
        <MotionButton
          variant="primary"
          className="w-full"
          onClick={handleSave}
          disabled={updateMutation.isPending}
        >
          {updateMutation.isPending ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="animate-spin" size={16} />
              Saving…
            </span>
          ) : (
            "Save changes"
          )}
        </MotionButton>
        <MotionButton
          variant="destructive"
          className="w-full"
          onClick={() => setDeleteOpen(true)}
          disabled={deleteMutation.isPending}
        >
          Delete clip
        </MotionButton>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        title="Delete this clip?"
        description={`“${clip.title}” will be removed from your library. This cannot be undone.`}
        confirmLabel="Delete clip"
        destructive
        loading={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </>
  );
}
