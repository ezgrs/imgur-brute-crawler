import dataclasses

import botocore.client

from processor.application.ports.storage import Storage


@dataclasses.dataclass(kw_only=True, frozen=True)
class S3Storage(Storage):
    client: botocore.client.BaseClient

    async def upload_image(self, id: str, contents: bytes) -> None:
        await self.client.put_object(
            Bucket="images",
            Key=id,
            Body=contents,
            ContentType="image/png",
        )
