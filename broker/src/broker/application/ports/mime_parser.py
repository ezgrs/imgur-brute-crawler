import typing


class MimeParseable(typing.Protocol):
    @property
    def mime_format(self) -> str | None: ...
