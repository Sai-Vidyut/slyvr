import subprocess
import uuid
import tempfile
from pathlib import Path
from typing import Optional


def generate_thumbnail(video_path: str, timestamp: float = 1.0, quality: int = 2) -> str:
    """Generate a thumbnail from video at given timestamp (seconds).

    Saves the image in the system temp directory with a UUID filename and returns the file path.

    Raises RuntimeError on failure.
    """
    temp_dir = Path(tempfile.gettempdir())
    temp_dir.mkdir(parents=True, exist_ok=True)

    filename = f"{uuid.uuid4().hex}.jpg"
    out_path = temp_dir / filename

    # Build ffmpeg command: seek to timestamp, grab one frame, set quality
    # -y to overwrite just in case
    cmd = [
        "ffmpeg",
        "-ss",
        str(timestamp),
        "-i",
        str(video_path),
        "-frames:v",
        "1",
        "-q:v",
        str(quality),
        "-y",
        str(out_path),
    ]

    try:
        completed = subprocess.run(
            cmd, capture_output=True, text=True, check=False
        )
    except Exception as exc:
        raise RuntimeError(f"Failed to run ffmpeg: {exc}") from exc

    if completed.returncode != 0 or not out_path.exists():
        stderr = completed.stderr if hasattr(completed, "stderr") else None
        raise RuntimeError(
            f"ffmpeg failed (code={completed.returncode}). stderr: {stderr}"
        )

    return str(out_path)


if __name__ == "__main__":
    # quick manual test/example (won't run during import)
    import sys

    if len(sys.argv) > 1:
        try:
            print(generate_thumbnail(sys.argv[1]))
        except Exception as e:
            print(f"Error: {e}")