import dataclasses
import typing


@dataclasses.dataclass(kw_only=True, frozen=True)
class Imaging(typing.Protocol):
    async def create_thumbnail(self, contents: bytes) -> bytes: ...
