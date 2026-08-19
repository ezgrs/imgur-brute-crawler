import dataclasses
import typing


@dataclasses.dataclass(kw_only=True, frozen=True)
class Image(typing.Protocol):
    async def create_thumbnail(self) -> bytes: ...
