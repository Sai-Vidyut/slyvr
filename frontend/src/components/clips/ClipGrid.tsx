import ClipCard from "./ClipCard";
import type { Clip } from "./ClipCard";

interface ClipGridProps {
  clips: Clip[];
  onClipClick: (clip: Clip) => void;
}

function ClipGrid({
  clips,
  onClipClick,
}: ClipGridProps) {
  if (clips.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-slate-500">
          No clips found
        </p>
      </div>
    );
  }

  const now = new Date();

  const sections = {
    Today: [] as Clip[],
    "Earlier This Week": [] as Clip[],
    "Earlier This Month": [] as Clip[],
    "Last Month": [] as Clip[],
    Older: [] as Clip[],
  };

  clips.forEach((clip) => {
    if (!clip.uploaded_at) {
      sections.Older.push(clip);
      return;
    }

    const uploaded = new Date(
      clip.uploaded_at
    );

    const diffDays =
      (now.getTime() - uploaded.getTime()) /
      (1000 * 60 * 60 * 24);

    if (diffDays < 1) {
      sections.Today.push(clip);
    } else if (diffDays < 7) {
      sections["Earlier This Week"].push(
        clip
      );
    } else if (diffDays < 30) {
      sections["Earlier This Month"].push(
        clip
      );
    } else if (diffDays < 60) {
      sections["Last Month"].push(clip);
    } else {
      sections.Older.push(clip);
    }
  });

  return (
    <div className="space-y-10">
      {Object.entries(sections).map(
        ([title, sectionClips]) => {
          if (sectionClips.length === 0)
            return null;

          return (
            <div key={title}>
              <div className="flex items-center gap-4 mb-4">
                <h2 className="text-xl font-semibold">
                  {title}
                </h2>

                <div className="h-px flex-1 bg-slate-800" />

                <span className="text-sm text-slate-500">
                  {sectionClips.length} clip
                  {sectionClips.length !== 1
                    ? "s"
                    : ""}
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {sectionClips.map((clip) => (
                  <ClipCard
                    key={clip.id}
                    clip={clip}
                    onClick={() =>
                      onClipClick(clip)
                    }
                  />
                ))}
              </div>
            </div>
          );
        }
      )}
    </div>
  );
}

export default ClipGrid;