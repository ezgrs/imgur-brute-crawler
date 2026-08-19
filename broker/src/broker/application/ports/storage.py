import typing


class Storage(typing.Protocol):
    async def upload_image(self, id: str, contents: bytes) -> None: ...
