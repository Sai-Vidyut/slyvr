"""Upload safety helpers."""

from services.upload_safety import safe_upload_basename


def test_safe_upload_basename_strips_path():
    assert safe_upload_basename("../../etc/passwd") == "passwd"
    assert safe_upload_basename(r"..\..\secret.mp4") == "secret.mp4"
    assert safe_upload_basename("") == "upload.bin"
    assert safe_upload_basename("..") == "upload.bin"
