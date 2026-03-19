import { X, Calendar, MapPin, Camera } from "lucide-react";
import { useEffect, useState } from "react";
import { updateClip, deleteClip } from "../../services/api";

interface Props {
  clip: any;
  isOpen: boolean;
  onClose: () => void;
}

function ClipDetailsDrawer({
  clip,
  isOpen,
  onClose,
}: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");

  useEffect(() => {
    if (!clip) return;

    setTitle(clip.title || "");
    setDescription(clip.description || "");
    setCategory(clip.category || "");
  }, [clip]);

  if (!clip || !isOpen) return null;

  return (
    <div
      className="
        fixed top-0 right-0
        h-full
        w-full md:w-[420px]
        bg-slate-950
        border-l border-slate-800
        shadow-2xl
        z-50
        overflow-y-auto
      "
    >
      <div className="sticky top-0 z-10 flex items-center justify-between p-4 md:p-6 border-b border-slate-800 bg-slate-950">
        <h2 className="text-lg md:text-xl font-semibold">
          Clip Details
        </h2>

        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-slate-900"
        >
          <X />
        </button>
      </div>

      <div className="p-4">
        <div className="flex justify-center rounded-2xl border border-slate-800 bg-black p-2">
          <video
            controls
            preload="metadata"
            className="
              max-h-[220px]
              md:max-h-[280px]
              w-auto
              max-w-full
              rounded-xl
            "
          >
            <source
              src={clip.blob_url}
              type="video/mp4"
            />
          </video>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-5 pb-40">
        <div>
          <p className="text-slate-500 text-sm mb-2">
            Title
          </p>

          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl bg-slate-900 border border-slate-700 p-3"
          />
        </div>

        <div>
          <p className="text-slate-500 text-sm mb-2">
            Description
          </p>

          <textarea
            value={description}
            onChange={(e) =>
              setDescription(e.target.value)
            }
            rows={4}
            className="w-full rounded-xl bg-slate-900 border border-slate-700 p-3"
          />
        </div>

        <div>
          <p className="text-slate-500 text-sm mb-2">
            Category
          </p>

          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-xl bg-slate-900 border border-slate-700 p-3"
          />
        </div>

        <div className="space-y-3 text-sm">
          {clip.camera_model && (
            <div className="flex gap-2 items-center">
              <Camera size={16} />
              {clip.camera_model}
            </div>
          )}

          {clip.latitude && clip.longitude && (
            <div className="flex gap-2 items-center">
              <MapPin size={16} />
              {clip.latitude}, {clip.longitude}
            </div>
          )}

          {clip.uploaded_at && (
            <div className="flex gap-2 items-center">
              <Calendar size={16} />
              {new Date(
                clip.uploaded_at
              ).toLocaleString()}
            </div>
          )}
        </div>
      </div>

      <div className="sticky bottom-0 bg-slate-950 border-t border-slate-800 p-4 space-y-3">
        <button
          onClick={async () => {
            try {
              await updateClip(clip.id, {
                title,
                description,
                category,
              });

              alert("Changes saved successfully!");
              window.location.reload();
            } catch (error) {
              console.error(error);
              alert("Failed to save changes.");
            }
          }}
          className="
            w-full
            rounded-xl
            bg-cyan-500
            p-3
            font-medium
            text-black
            hover:bg-cyan-400
          "
        >
          Save Changes
        </button>

        <button
          onClick={async () => {
            const confirmed = window.confirm(
              `Delete "${clip.title}"?`
            );

            if (!confirmed) return;

            try {
              await deleteClip(clip.id);

              alert("Clip deleted successfully!");
              window.location.reload();
            } catch (error) {
              console.error(error);
              alert("Failed to delete clip.");
            }
          }}
          className="
            w-full
            rounded-xl
            bg-red-600
            p-3
            font-medium
            text-white
            hover:bg-red-500
          "
        >
          Delete Clip
        </button>
      </div>
    </div>
  );
}

export default ClipDetailsDrawer;