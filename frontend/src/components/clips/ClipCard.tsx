import {
  Calendar,
  MapPin,
  Camera,
} from "lucide-react";

export interface Clip {
  id: number;
  title: string;
  description?: string;
  category?: string;
  thumbnail_url?: string;
  camera_model?: string;
  latitude?: number;
  longitude?: number;
  uploaded_at?: string;
}

interface ClipCardProps {
  clip: Clip;
  onClick?: () => void;
}

function ClipCard({
  clip,
  onClick,
}: ClipCardProps) {
  return (
    <div
      onClick={onClick}
      className="
        group
        cursor-pointer
        overflow-hidden
        rounded-3xl
        border
        border-slate-800
        bg-slate-900/60
        backdrop-blur-md
        transition-all
        duration-300
        hover:-translate-y-1
        hover:border-cyan-500/50
        hover:shadow-[0_0_40px_rgba(34,211,238,0.12)]
      "
    >
      <div className="aspect-video overflow-hidden bg-slate-950">
        <img
          src={clip.thumbnail_url}
          alt={clip.title}
          className="
            h-full
            w-full
            object-cover
            transition-transform
            duration-500
            group-hover:scale-105
          "
        />
      </div>

      <div className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs text-cyan-300">
            {clip.category || "Uncategorized"}
          </span>
        </div>

        <h3 className="text-lg font-semibold text-white line-clamp-1">
          {clip.title}
        </h3>

        {clip.uploaded_at && (
          <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
            <Calendar size={13} />

            <span>
              {new Date(
                clip.uploaded_at
              ).toLocaleString()}
            </span>
          </div>
        )}

        <p className="mt-3 line-clamp-2 text-sm text-slate-400">
          {clip.description ||
            "No description available"}
        </p>

        <div className="mt-4 space-y-2 text-xs text-slate-500">
          {clip.camera_model && (
            <div className="flex items-center gap-2">
              <Camera size={14} />

              <span className="truncate">
                {clip.camera_model}
              </span>
            </div>
          )}

          {clip.latitude &&
            clip.longitude && (
              <div className="flex items-center gap-2">
                <MapPin size={14} />

                <span className="truncate">
                  {clip.latitude},{" "}
                  {clip.longitude}
                </span>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}

export default ClipCard;