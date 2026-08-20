import dataclasses

import botocore.client

from processor.application.ports.storage import Storage
from processor.infrastructure.mime_parseables.hardcoded import (
    HardcodedMimeParseable,
)


@dataclasses.dataclass(kw_only=True, frozen=True)
class S3Storage(Storage):
    client: botocore.client.BaseClient

    async def upload_image(self, id: str, contents: bytes) -> None:
        mime_parseable = HardcodedMimeParseable(contents=contents)
        await self.client.put_object(
            Bucket="images",
            Key=id,
            Body=contents,
            ContentType=mime_parseable.mime_format,
        )
