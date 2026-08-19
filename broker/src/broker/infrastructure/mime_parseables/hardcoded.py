import dataclasses

from broker.application.ports.mime_parser import MimeParseable


@dataclasses.dataclass(kw_only=True, frozen=True)
class HardcodedMimeParseable(MimeParseable):
    contents: bytes

    @property
    def mime_format(self) -> str | None:
        return {
            b"\xff\xd8\xff\xe0": "image/jpeg",
            b"\xff\xd8\xff\xe1": "image/jpeg",
            b"\xff\xd8\xff\xe2": "image/jpeg",
            b"\xff\xd8\xff\xe8": "image/jpeg",
            b"\xff\xd8\xff\xee": "image/jpeg",
            b"\xff\xd8\xff\xfe": "image/jpeg",
            b"\xff\xd8\xff\xdb": "image/jpeg",
            b"\x47\x49\x46\x38": "image/gif",
            b"\x89\x50\x4e\x47": "image/png",
        }.get(self.contents[:4])
