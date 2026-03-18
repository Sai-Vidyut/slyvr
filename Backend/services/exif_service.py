import json
import subprocess
from typing import Any, Dict, Optional


def _parse_exiftool_output(output: str) -> Dict[str, Optional[Any]]:
    try:
        items = json.loads(output)
    except json.JSONDecodeError as exc:
        raise RuntimeError("Failed to parse ExifTool output") from exc

    if not isinstance(items, list) or not items:
        return {
            "camera_model": None,
            "create_date": None,
            "gps_latitude": None,
            "gps_longitude": None,
        }

    item = items[0]
    return {
        "camera_model": item.get("Model"),
        "create_date": item.get("CreateDate"),
        "gps_latitude": item.get("GPSLatitude"),
        "gps_longitude": item.get("GPSLongitude"),
    }


def extract_metadata(file_path: str) -> Dict[str, Optional[Any]]:
    """Extract selected metadata from a video file using ExifTool."""
    command = [
        "exiftool",
        "-j",
        "-Model",
        "-CreateDate",
        "-GPSLatitude",
        "-GPSLongitude",
        file_path,
    ]

    try:
        result = subprocess.run(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            check=False,
        )
    except FileNotFoundError as exc:
        raise RuntimeError("ExifTool not found. Make sure exiftool is installed and on the PATH.") from exc
    except OSError as exc:
        raise RuntimeError("Failed to execute ExifTool command.") from exc

    if result.returncode != 0:
        stderr_message = result.stderr.strip() or "Unknown ExifTool error"
        raise RuntimeError(f"ExifTool returned non-zero exit code {result.returncode}: {stderr_message}")

    return _parse_exiftool_output(result.stdout)
