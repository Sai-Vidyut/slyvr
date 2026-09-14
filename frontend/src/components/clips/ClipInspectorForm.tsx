import { m } from "framer-motion";
import { Loader2, Users } from "lucide-react";
import { useState } from "react";

import { MotionButton } from "@/components/ui/motion-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ClipMetadataSections } from "@/components/clips/ClipMetadataSections";
import { useClipReadUrl } from "@/hooks/use-clip-read-url";
import {
  useDeleteClipMutation,
  useUpdateClipMutation,
} from "@/hooks/use-clips-queries";
import { isSignedMediaReadsEnabled } from "@/lib/signed-media-reads";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { drawerSectionContainer, fadeUp } from "@/lib/motion";
import type { Category, Clip } from "@/types/clip";

const fieldClass =
  "surface-inset w-full p-3 text-sm text-[var(--clip-fg)] focus:outline-none focus:ring-2 focus:ring-[var(--clip-accent)]/40";

interface ClipInspectorFormProps {
  clip: Clip;
  categories: Category[];
  onDeleted: () => void;
  /** Demo/static clips: use blob_url directly (no read-url API). */
  directMediaUrls?: boolean;
}

export function ClipInspectorForm({
  clip,
  categories,
  onDeleted,
  directMediaUrls = false,
}: ClipInspectorFormProps) {
  const reduced = useReducedMotion();
  const updateMutation = useUpdateClipMutation();
  const deleteMutation = useDeleteClipMutation();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [title, setTitle] = useState(clip.title || "");
  const [description, setDescription] = useState(clip.description || "");
  const [category, setCategory] = useState(clip.category || "");
  const signedReads = isSignedMediaReadsEnabled() && !directMediaUrls;
  const mediaRead = useClipReadUrl(clip.id, "media", signedReads);
  const mediaSrc = signedReads ? mediaRead.data?.url : clip.blob_url;

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
          {signedReads && mediaRead.isLoading ? (
            <div className="flex items-center justify-center py-12 text-meta">
              <Loader2 className="mr-2 size-5 animate-spin" aria-hidden />
              Loading media…
            </div>
          ) : mediaSrc ? (
            clip.mime_type?.startsWith("image/") ? (
              <img
                src={mediaSrc}
                alt=""
                className="max-h-[240px] w-full object-contain md:max-h-[280px]"
              />
            ) : (
              <video
                key={mediaSrc}
                controls
                preload="metadata"
                className="max-h-[240px] w-full object-contain md:max-h-[280px]"
              >
                <source src={mediaSrc} type={clip.mime_type || "video/mp4"} />
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
