import asyncio
import dataclasses
import io

import PIL.Image
import PIL.ImageOps

from processor.application.ports.imaging import Imaging


@dataclasses.dataclass(kw_only=True, frozen=True)
class PillowImaging(Imaging):
    def _create_thumbnail(self, contents: bytes) -> bytes:
        image = PIL.Image.open(io.BytesIO(contents))
        image = PIL.ImageOps.exif_transpose(image)
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

    async def create_thumbnail(self, contents: bytes) -> bytes:
        return await asyncio.to_thread(self._create_thumbnail, contents)
