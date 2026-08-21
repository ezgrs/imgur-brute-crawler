import asyncio
import dataclasses
import io

import PIL.Image
import PIL.ImageOps

from processor.application.ports.image import Image


@dataclasses.dataclass(kw_only=True, frozen=True)
class PillowImage(Image):
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
