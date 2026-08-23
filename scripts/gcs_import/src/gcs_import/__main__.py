import io
import hashlib
import pathlib
import re
import typing

import pydantic_settings
import boto3
import psycopg
import google.cloud.storage
import PIL
import PIL.Image
import PIL.ImageOps


class Settings(pydantic_settings.BaseSettings):
    model_config = pydantic_settings.SettingsConfigDict(env_file=".env")

    GCS_BUCKET_NAME: str

    MINIO_HOST: str
    MINIO_PORT: int
    MINIO_USERNAME: str
    MINIO_PASSWORD: str

    POSTGRES_HOST: str
    POSTGRES_PORT: int
    POSTGRES_DATABASE: str
    POSTGRES_USERNAME: str
    POSTGRES_PASSWORD: str


def create_log(image_id: str) -> typing.Callable[[str], None]:
    def _(message: str) -> None:
        print(f"[{image_id}] {message}")

    return _


def create_thumbnail(image: PIL.Image.Image) -> bytes:
    image = PIL.ImageOps.exif_transpose(image)
    image.thumbnail((256, 256), PIL.Image.Resampling.LANCZOS)

    if image.mode in ("RGBA", "LA", "P"):
        image = image.convert("RGB")

    output = io.BytesIO()
    image.save(
        output,
        format="JPEG",
        quality=85,
        optimize=True,
    )
    output.seek(0)
    return output.getvalue()


def run(settings: Settings) -> None:
    gcs = google.cloud.storage.Client()

    s3 = boto3.client(
        "s3",
        endpoint_url=f"http://{settings.MINIO_HOST}:{settings.MINIO_PORT}",
        aws_access_key_id=settings.MINIO_USERNAME,
        aws_secret_access_key=settings.MINIO_PASSWORD,
    )

    db = psycopg.connect(
        "postgresql://"
        f"{settings.POSTGRES_USERNAME}:"
        f"{settings.POSTGRES_PASSWORD}@"
        f"{settings.POSTGRES_HOST}:"
        f"{settings.POSTGRES_PORT}/"
        f"{settings.POSTGRES_DATABASE}"
    )

    gcs_bucket = gcs.bucket(settings.GCS_BUCKET_NAME)
    for blob in gcs.list_blobs(gcs_bucket):
        print("========================================")
        image_id = pathlib.Path(blob.name).stem

        log = create_log(image_id)
        log(f"Processing...")

        # Validate ID
        if not re.fullmatch(r"[A-Za-z0-9]{7}", image_id):
            log("Skipping, invalid ID")
            continue

        # Check whether it's already imported
        with db.cursor() as cursor:
            cursor.execute(
                "SELECT 1 FROM images WHERE id = %s",
                (image_id,),
            )
            if cursor.fetchone() is not None:
                log("Skipping, already exists")
                continue

        # Download from GCS
        log("Downloading from GCS...")
        image_bytes = blob.download_as_bytes()

        # Inspect image
        try:
            with PIL.Image.open(io.BytesIO(image_bytes)) as image:
                width, height = image.size
                thumbnail_bytes = create_thumbnail(image)

        except (PIL.UnidentifiedImageError, OSError):
            log("Skipping, not an image")
            continue

        size = len(image_bytes)
        mime_type = blob.content_type or "application/octet-stream"
        image_hash = hashlib.sha256(image_bytes).hexdigest()

        # Upload original to S3
        log("Uploading to S3...")
        s3.put_object(
            Bucket="images",
            Key=image_id,
            Body=image_bytes,
            ContentType=mime_type,
            Metadata={"original-created-at": blob.time_created.isoformat()},
        )

        log("Uploading thumbnail to S3...")
        s3.put_object(
            Bucket="thumbnails",
            Key=image_id,
            Body=thumbnail_bytes,
            ContentType="image/jpeg",
        )

        log("Inserting database row...")
        with db.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO images (
                    id,
                    width,
                    height,
                    size,
                    mime_type,
                    hash,
                    created_at
                )
                VALUES (
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s
                )
                """,
                (
                    image_id,
                    width,
                    height,
                    size,
                    mime_type,
                    image_hash,
                    blob.time_created,
                ),
            )

        db.commit()

        log("Done")


def main() -> None:
    settings = Settings()  # type: ignore
    return run(settings)


if __name__ == "__main__":
    main()
