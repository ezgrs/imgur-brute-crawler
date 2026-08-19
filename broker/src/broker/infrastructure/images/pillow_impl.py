import asyncio
import dataclasses
import io

from broker.application.ports.image import Image
import PIL.Image
import PIL.ImageOps

from broker.application.ports.mime_parser import MimeParseable


@dataclasses.dataclass(kw_only=True, frozen=True)
class PillowImage(Image, MimeParseable):
    image: PIL.Image.Image

    @staticmethod
    async def from_bytes(contents: bytes) -> "PillowImage":
        return PillowImage(
            image=PIL.Image.open(io.BytesIO(contents)),
        )

    def _create_thumbnail(self) -> bytes:
        image = PIL.ImageOps.exif_transpose(self.image)
        image.thumbnail((256, 256), PIL.Image.Resampling.LANCZOS)

        output = io.BytesIO()
        image.save(
            output,
            format="JPEG",
            quality=85,
            optimize=True,
        )
        output.seek(0)
        return output.getvalue()

    async def create_thumbnail(self) -> bytes:
        return await asyncio.to_thread(self._create_thumbnail)

    @property
    def mime_format(self) -> str | None:
        format = self.image.format
        if format is None:
            return None

        return {
            "JPEG": "image/jpeg",
            "PNG": "image/png",
            "WEBP": "image/webp",
            "GIF": "image/gif",
            "BMP": "image/bmp",
            "TIFF": "image/tiff",
            "AVIF": "image/avif",
            "HEIF": "image/heif",
            "HEIC": "image/heic",
        }.get(format)
