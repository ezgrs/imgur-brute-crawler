import contextlib
import typing

import aioboto3
import faststream
import faststream.rabbit
import pydantic
import pydantic_settings

from processor.application.ports.storage import Storage
from processor.infrastructure.minio_storage import S3Storage


class ImageSaved(pydantic.BaseModel):
    image_id: str


class Settings(pydantic_settings.BaseSettings):
    minio_root_username: str
    minio_root_password: str

    rabbitmq_root_username: str
    rabbitmq_root_password: str


async def _initialize_storage(
    exit_stack: contextlib.AsyncExitStack, settings: Settings
) -> Storage:
    s3_session = aioboto3.Session()
    s3_client = await exit_stack.enter_async_context(
        typing.cast(
            contextlib.AbstractAsyncContextManager,
            s3_session.client(
                "s3",
                endpoint_url="http://minio:9000",
                aws_access_key_id=settings.minio_root_username,
                aws_secret_access_key=settings.minio_root_password,
                region_name="us-east-1",
            ),
        )
    )
    return S3Storage(client=s3_client)


def create_app() -> faststream.FastStream:
    settings = Settings()  # pyright: ignore[reportCallIssue]

    exit_stack = contextlib.AsyncExitStack()

    broker = faststream.rabbit.RabbitBroker(
        url=(
            "amqp://"
            f"{settings.rabbitmq_root_username}:"
            f"{settings.rabbitmq_root_password}@"
            "rabbitmq:5672"
        ),
    )
    app = faststream.FastStream(broker)
    image_saved_queue = faststream.rabbit.RabbitQueue(
        "image.saved.thumbnail-processor", declare=False
    )

    storage: Storage

    @app.after_startup
    async def on_startup():
        nonlocal storage
        storage = await _initialize_storage(exit_stack, settings)

    @broker.subscriber(queue=image_saved_queue)
    async def on_image_saved(event: ImageSaved) -> None:
        print("persist_thumbnail", event.image_id)

    @app.after_shutdown
    async def on_shutdown() -> None:
        await exit_stack.aclose()

    return app
