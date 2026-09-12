import { AnimatePresence, m } from "framer-motion";
import { CheckCircle2, FileVideo, Loader2, Upload, X } from "lucide-react";
import { type RefObject, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motionToast as toast } from "@/components/ui/motion-toast";

import {
  useCategoriesQuery,
  useCreateCategoryMutation,
  useCreatePersonMutation,
  useInvalidateClips,
  usePeopleQuery,
} from "@/hooks/use-clips-queries";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { MotionButton } from "@/components/ui/motion-button";
import {
  backdropVariants,
  fadeUp,
  modalPanelVariants,
  motionTransition,
  staggerItem,
  tweenFast,
  tweenSurface,
  tweenUi,
} from "@/lib/motion";
import { cn } from "@/lib/utils";
import { useDialogFocus } from "@/hooks/use-dialog-focus";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { uploadClip } from "@/services/api";
import { getApiErrorMessage } from "@/lib/api-client";

interface Props {
  onClose: () => void;
  returnFocusRef?: RefObject<HTMLElement | null>;
}

interface UploadItem {
  file: File;
  title: string;
  description: string;
}

type UploadPhase = "idle" | "selected" | "uploading" | "success" | "error";

const MEDIA_ACCEPT =
  "video/mp4,video/quicktime,video/x-msvideo,video/x-matroska,image/jpeg,image/png,image/webp,image/heic,image/heif,image/tiff,image/gif";

function UploadModal({ onClose, returnFocusRef }: Props) {
  const reducedMotion = useReducedMotion();
  const isMobile = useIsMobile();
  const transition = motionTransition(reducedMotion, tweenSurface);
  const invalidateClips = useInvalidateClips();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const { data: categories = [] } = useCategoriesQuery();
  const { data: people = [] } = usePeopleQuery();
  const createCategoryMutation = useCreateCategoryMutation();
  const createPersonMutation = useCreatePersonMutation();

  const [files, setFiles] = useState<UploadItem[]>([]);
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedPeople, setSelectedPeople] = useState<number[]>([]);
  const [applyTitle, setApplyTitle] = useState("");
  const [applyDescription, setApplyDescription] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newPerson, setNewPerson] = useState("");

  const requestClose = useCallback(() => {
    if (phase === "uploading") return;
    onClose();
  }, [onClose, phase]);

  useDialogFocus({
    open: true,
    containerRef: dialogRef,
    initialFocusRef: closeButtonRef,
    returnFocusRef,
    onEscape: requestClose,
  });

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const addFiles = (incoming: File[]) => {
    const videos = incoming.filter(
      (f) => f.type.startsWith("video/") || f.type.startsWith("image/"),
    );
    if (videos.length === 0) {
      toast.error("Please select valid video or image files");
      return;
    }
    if (videos.length < incoming.length) {
      toast.message("Some files were skipped (videos and images only)");
    }
    const newItems: UploadItem[] = videos.map((file) => ({
      file,
      title: "",
      description: "",
    }));
    setFiles((prev) => [...prev, ...newItems]);
    setPhase("selected");
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(e.target.files || []));
    e.target.value = "";
  };

  const updateFile = (index: number, field: keyof UploadItem, value: string) => {
    setFiles((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const applyToAll = () => {
    setFiles((prev) =>
      prev.map((item, index) => ({
        ...item,
        title:
          prev.length === 1
            ? applyTitle
            : applyTitle
              ? `${applyTitle}${index > 0 ? ` (${index + 1})` : ""}`
              : item.title,
        description: applyDescription || item.description,
      })),
    );
  };

  const togglePerson = (personId: number) => {
    setSelectedPeople((prev) =>
      prev.includes(personId)
        ? prev.filter((id) => id !== personId)
        : [...prev, personId],
    );
  };

  const handleAddCategory = async () => {
    const name = newCategory.trim();
    if (!name) return;
    const category = await createCategoryMutation.mutateAsync(name);
    setSelectedCategory(category.id);
    setNewCategory("");
  };

  const handleAddPerson = async () => {
    const name = newPerson.trim();
    if (!name) return;
    const person = await createPersonMutation.mutateAsync(name);
    setSelectedPeople((prev) => [...prev, person.id]);
    setNewPerson("");
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error("Select at least one video");
      return;
    }
    const missingTitle = files.some((f) => !f.title.trim());
    if (missingTitle) {
      toast.error("Each clip needs a title");
      return;
    }

    setPhase("uploading");
    setUploadProgress(null);

    try {
      let completed = 0;
      for (const item of files) {
        const formData = new FormData();
        formData.append("video", item.file);
        formData.append("title", item.title.trim());
        formData.append("description", item.description);
        if (selectedCategory != null) {
          formData.append("category_id", String(selectedCategory));
        }
        formData.append("person_ids", selectedPeople.join(","));

        await uploadClip(formData, (percent) => {
          const aggregate = Math.round(
            ((completed + percent / 100) / files.length) * 100,
          );
          setUploadProgress(aggregate);
        });
        completed += 1;
        setUploadProgress(Math.round((completed / files.length) * 100));
      }

      setPhase("success");
      toast.success(
        `${files.length} clip${files.length === 1 ? "" : "s"} uploaded`,
      );
      invalidateClips();
      window.setTimeout(() => {
        onClose();
      }, 600);
    } catch (error) {
      console.error(error);
      setPhase("error");
      toast.error(getApiErrorMessage(error));
    }
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      <>
          <m.div
            key="upload-backdrop"
            className={cn(
              "fixed inset-0 z-[100] bg-black/60",
              isMobile
                ? "flex items-end justify-center p-0"
                : "flex items-center justify-center p-4",
            )}
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={motionTransition(reducedMotion, tweenUi)}
            onClick={requestClose}
            role="presentation"
          >
            <m.div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="upload-modal-title"
              tabIndex={-1}
              className={cn(
                "relative w-full overflow-y-auto border border-[var(--clip-border)] bg-[var(--clip-bg-elevated)] outline-none",
                isMobile
                  ? "max-h-[92dvh] rounded-t-2xl border-b-0 p-5 pb-safe"
                  : "max-h-[90vh] max-w-[900px] rounded-md p-6",
              )}
              variants={isMobile ? undefined : modalPanelVariants}
              initial={isMobile ? { y: "100%" } : "hidden"}
              animate={isMobile ? { y: 0 } : "visible"}
              exit={isMobile ? { y: "100%" } : "exit"}
              transition={transition}
              onClick={(e) => e.stopPropagation()}
            >
              {isMobile ? (
                <div className="mb-3 flex justify-center" aria-hidden>
                  <span className="h-1 w-10 rounded-full bg-[var(--clip-border-strong)]" />
                </div>
              ) : null}
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <p className="text-label">Upload</p>
                  <h2 id="upload-modal-title" className="text-title mt-1">
                    Add to library
                  </h2>
                  <p className="mt-1 text-sm text-[var(--clip-muted)]">
                    {phase === "uploading"
                      ? "Upload in progress…"
                      : isMobile
                        ? "Choose photos or videos from your phone"
                        : "Add metadata, then upload to cloud storage"}
                  </p>
                </div>
                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={requestClose}
                  disabled={phase === "uploading"}
                  className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md hover:bg-[var(--clip-surface)] disabled:opacity-40"
                  aria-label="Close upload dialog"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="mb-6 rounded-md border border-[var(--clip-border)] p-4">
                <h3 className="mb-3 text-sm font-medium">Apply to all</h3>
                <div className="space-y-3">
                  <input
                    placeholder="Base title"
                    value={applyTitle}
                    onChange={(e) => setApplyTitle(e.target.value)}
                    disabled={phase === "uploading"}
                    className="surface-inset w-full disabled:opacity-60"
                  />
                  <textarea
                    placeholder="Description"
                    value={applyDescription}
                    onChange={(e) => setApplyDescription(e.target.value)}
                    rows={3}
                    disabled={phase === "uploading"}
                    className="surface-inset w-full disabled:opacity-60"
                  />
                  <MotionButton
                    variant="secondary"
                    onClick={applyToAll}
                    disabled={phase === "uploading" || files.length === 0}
                  >
                    Apply to all
                  </MotionButton>
                </div>
              </div>

              <div className="mb-6 grid gap-6 md:grid-cols-2">
                <div className="rounded-md border border-[var(--clip-border)] p-4">
                  <h3 className="mb-3 text-sm font-medium">Category</h3>
                  <select
                    value={selectedCategory ?? ""}
                    onChange={(e) =>
                      setSelectedCategory(
                        e.target.value ? Number(e.target.value) : null,
                      )
                    }
                    disabled={phase === "uploading"}
                    className="surface-inset w-full disabled:opacity-60"
                  >
                    <option value="">Select category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  <div className="mt-3 flex gap-2">
                    <input
                      placeholder="New category"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      disabled={phase === "uploading"}
                      className="surface-inset flex-1 disabled:opacity-60"
                    />
                    <button
                      type="button"
                      onClick={handleAddCategory}
                      disabled={phase === "uploading"}
                      className="min-w-11 rounded-md border border-[var(--clip-border)] bg-[var(--clip-surface)] px-4 disabled:opacity-50"
                      aria-label="Add category"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="rounded-md border border-[var(--clip-border)] p-4">
                  <h3 className="mb-3 text-sm font-medium">People</h3>
                  <div className="mb-3 max-h-52 space-y-2 overflow-y-auto">
                    {people.length === 0 ? (
                      <p className="text-meta">No people yet</p>
                    ) : (
                      people.map((person) => (
                        <label
                          key={person.id}
                          className="flex min-h-10 cursor-pointer items-center gap-3 rounded-md border border-transparent px-2 hover:border-[var(--clip-border)] hover:bg-[var(--clip-surface)]"
                        >
                          <input
                            type="checkbox"
                            checked={selectedPeople.includes(person.id)}
                            onChange={() => togglePerson(person.id)}
                            disabled={phase === "uploading"}
                          />
                          <span>{person.name}</span>
                        </label>
                      ))
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input
                      placeholder="New person"
                      value={newPerson}
                      onChange={(e) => setNewPerson(e.target.value)}
                      disabled={phase === "uploading"}
                      className="surface-inset flex-1 disabled:opacity-60"
                    />
                    <button
                      type="button"
                      onClick={handleAddPerson}
                      disabled={phase === "uploading"}
                      className="min-w-11 rounded-md border border-[var(--clip-border)] bg-[var(--clip-surface)] px-4 disabled:opacity-50"
                      aria-label="Add person"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              <m.div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  if (phase === "uploading") return;
                  addFiles(Array.from(e.dataTransfer.files));
                }}
                animate={
                  reducedMotion
                    ? undefined
                    : {
                        y: dragOver ? -2 : 0,
                        scale: dragOver ? 1.005 : 1,
                      }
                }
                transition={tweenFast}
                className={cn(
                  "mb-6 rounded-md border border-dashed p-8 text-center transition-colors",
                  dragOver
                    ? "border-[var(--clip-border-strong)] bg-[var(--clip-surface)]"
                    : "border-[var(--clip-border)] bg-[var(--clip-bg-elevated)]",
                )}
              >
                <input
                  type="file"
                  accept={MEDIA_ACCEPT}
                  multiple
                  id="video-upload"
                  className="hidden"
                  onChange={handleFileSelect}
                  disabled={phase === "uploading"}
                />
                <label
                  htmlFor="video-upload"
                  className={cn(
                    "block cursor-pointer",
                    phase === "uploading" && "pointer-events-none opacity-60",
                  )}
                >
                  <m.div
                    animate={
                      reducedMotion
                        ? undefined
                        : { y: dragOver ? -4 : 0, scale: dragOver ? 1.08 : 1 }
                    }
                    transition={tweenFast}
                    className="mx-auto mb-3 inline-flex"
                  >
                    <Upload className="text-[var(--clip-muted)]" size={28} />
                  </m.div>
                  <p className="text-base font-medium">Drop videos or browse</p>
                  <p className="mt-1 text-meta">
                    MP4 · MOV · AVI · MKV
                  </p>
                  {files.length > 0 && (
                    <p className="mt-3 text-sm text-[var(--clip-fg)]">
                      {files.length} file{files.length === 1 ? "" : "s"} selected
                    </p>
                  )}
                </label>
              </m.div>

              <AnimatePresence mode="popLayout">
                <div className="space-y-4">
                {files.map((item, index) => (
                  <m.div
                    key={`${item.file.name}-${index}`}
                    layout={!reducedMotion}
                    variants={staggerItem}
                    initial={reducedMotion ? false : "hidden"}
                    animate="visible"
                    exit="exit"
                    className="rounded-md border border-[var(--clip-border)] p-4"
                  >
                    <div className="mb-3 flex items-start gap-3">
                      <FileVideo className="mt-0.5 shrink-0 text-[var(--clip-muted)]" size={20} />
                      <div>
                        <p className="text-sm font-medium">{item.file.name}</p>
                        <p className="text-meta">
                          {(item.file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <input
                        placeholder="Title *"
                        value={item.title}
                        onChange={(e) => updateFile(index, "title", e.target.value)}
                        disabled={phase === "uploading"}
                        className="surface-inset w-full disabled:opacity-60"
                      />
                      <textarea
                        placeholder="Description"
                        value={item.description}
                        onChange={(e) =>
                          updateFile(index, "description", e.target.value)
                        }
                        rows={3}
                        disabled={phase === "uploading"}
                        className="surface-inset w-full disabled:opacity-60"
                      />
                    </div>
                  </m.div>
                ))}
                </div>
              </AnimatePresence>

              <AnimatePresence>
                {phase === "success" && (
                  <m.div
                    key="upload-success"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mt-6 flex items-center gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100"
                  >
                    <CheckCircle2 size={18} aria-hidden />
                    Upload complete — refreshing library…
                  </m.div>
                )}
                {phase === "error" && (
                  <m.div
                    key="upload-error"
                    variants={fadeUp}
                    initial="hidden"
                    animate="visible"
                    className="mt-6 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-100"
                  >
                    Upload failed. Fix any issues and try again.
                  </m.div>
                )}
              </AnimatePresence>

              {phase === "uploading" && uploadProgress != null && (
                <div className="mb-6 mt-6">
                  <div className="mb-2 flex justify-between text-sm">
                    <span>Upload progress</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[var(--clip-surface-3)]">
                    <m.div
                      className="h-full bg-[var(--clip-accent)]"
                      initial={{ width: 0 }}
                      animate={{ width: `${uploadProgress}%` }}
                      transition={tweenFast}
                    />
                  </div>
                </div>
              )}

              {phase === "uploading" && uploadProgress == null && (
                <div className="mb-6 mt-6 flex items-center gap-2 text-sm text-[var(--clip-muted)]">
                  <Loader2 className="animate-spin" size={18} />
                  Uploading…
                </div>
              )}

              <div className="mt-6 flex gap-3">
                <MotionButton
                  className="flex-1"
                  onClick={requestClose}
                  disabled={phase === "uploading"}
                >
                  Cancel
                </MotionButton>
                <MotionButton
                  variant="primary"
                  className="flex-1"
                  onClick={handleUpload}
                  disabled={
                    phase === "uploading" ||
                    files.length === 0 ||
                    phase === "success"
                  }
                >
                  {phase === "uploading"
                    ? "Uploading…"
                    : `Upload${files.length ? ` (${files.length})` : ""}`}
                </MotionButton>
              </div>
            </m.div>
          </m.div>
      </>
    </AnimatePresence>,
    document.body,
  );
}

export default UploadModal;
