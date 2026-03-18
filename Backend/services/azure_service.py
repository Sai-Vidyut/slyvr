import os
import uuid
from pathlib import Path
from dotenv import load_dotenv
from azure.storage.blob import BlobServiceClient
from azure.core.exceptions import AzureError
from azure.storage.blob import ContentSettings
from urllib.parse import urlparse

load_dotenv()

AZURE_CONNECTION_STRING = os.getenv("AZURE_CONNECTION_STRING")



def upload_file_to_azure(file_path: str, container_name: str) -> str:
    """
    Upload a file to Azure Blob Storage.

    Args:
        file_path: Path to the file to upload
        container_name: Name of the container to upload to

    Returns:
        The blob URL of the uploaded file

    Raises:
        ValueError: If connection string is not configured
        AzureError: If upload fails
    """
    if not AZURE_CONNECTION_STRING:
        raise ValueError("AZURE_CONNECTION_STRING environment variable not set")

    try:
        file_path_obj = Path(file_path)
        if not file_path_obj.exists():
            raise FileNotFoundError(f"File not found: {file_path}")

        file_extension = file_path_obj.suffix
        blob_name = f"{uuid.uuid4()}{file_extension}"

        content_type = "application/octet-stream"
        if file_extension.lower() in [".jpg", ".jpeg"]:
            content_type = "image/jpeg"
        elif file_extension.lower() == ".png":
            content_type = "image/png"
        elif file_extension.lower() == ".mp4":
            content_type = "video/mp4"

        blob_service_client = BlobServiceClient.from_connection_string(
            AZURE_CONNECTION_STRING
        )
        container_client = blob_service_client.get_container_client(container_name)

        blob_client = container_client.get_blob_client(blob_name)

        with open(file_path, "rb") as file_data:
            blob_client.upload_blob(
                file_data,
                overwrite=True,
                content_settings=ContentSettings(content_type=content_type)
            )

        blob_url = blob_client.url
        return blob_url

    except FileNotFoundError as e:
        raise FileNotFoundError(f"Upload failed: {str(e)}")
    except AzureError as e:
        raise AzureError(f"Azure Blob Storage upload failed: {str(e)}")
    except Exception as e:
        raise Exception(f"Unexpected error during file upload: {str(e)}")


def delete_blob_from_azure(blob_url: str):
    if not AZURE_CONNECTION_STRING:
        raise ValueError("AZURE_CONNECTION_STRING environment variable not set")

    blob_service_client = BlobServiceClient.from_connection_string(
        AZURE_CONNECTION_STRING
    )

    parsed = urlparse(blob_url)

    path_parts = parsed.path.lstrip("/").split("/")

    container_name = path_parts[0]
    blob_name = "/".join(path_parts[1:])

    blob_client = blob_service_client.get_blob_client(
        container=container_name,
        blob=blob_name
    )

    blob_client.delete_blob()