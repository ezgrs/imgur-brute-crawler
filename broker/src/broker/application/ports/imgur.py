import typing


class Imgur(typing.Protocol):
    async def download_image(self, id: str) -> bytes | None: ...
