import dataclasses

from processor.application.ports.imaging import Imaging
from processor.application.ports.storage import Storage


@dataclasses.dataclass(kw_only=True, frozen=True)
class GenerateUseCase:
    imaging: Imaging
    storage: Storage

    async def execute(self, image_id: str) -> None:
        contents = await self.storage.download_image("images", image_id)
        thumbnail_contents = await self.imaging.create_thumbnail(contents)
        await self.storage.upload_image(
            "thumbnails", image_id, thumbnail_contents
        )
