import contextlib
import typing

import aioboto3
import botocore.exceptions
import faststream
import faststream.rabbit
import httpx
import pydantic
import pydantic_settings

from broker.application.ports.imgur import Imgur
from broker.application.ports.storage import Storage
from broker.infrastructure.imgurs.httpx_impl import HttpxImgur
from broker.infrastructure.storages.minio_impl import S3Storage


class ImageRequested(pydantic.BaseModel):
    image_id: str


class ImageSaveFailed(pydantic.BaseModel):
    image_id: str


class ImageSaved(pydantic.BaseModel):
    image_id: str


class Settings(pydantic_settings.BaseSettings):
    minio_root_username: str
    minio_root_password: str

    rabbitmq_root_username: str
    rabbitmq_root_password: str


async def _initialize_imgur(exit_stack: contextlib.AsyncExitStack) -> Imgur:
    http_client = await exit_stack.enter_async_context(
        httpx.AsyncClient(
            base_url=httpx.URL(scheme="https", host="i.imgur.com"),
        )
    )
    return HttpxImgur(client=http_client)


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

    # Create initial buckets
    for bucket_name in ("images",):
        try:
            await s3_client.head_bucket(Bucket=bucket_name)
        except botocore.exceptions.ClientError as e:
            match e.response.get("Error"):
                case {"Code": "404", "Message": "Not Found"}:
                    await s3_client.create_bucket(Bucket=bucket_name)
                case _:
                    raise

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
    exchange = faststream.rabbit.RabbitExchange("events", declare=False)
    image_requested_queue = faststream.rabbit.RabbitQueue(
        "image.requested", declare=False
    )
    image_saved_queue = faststream.rabbit.RabbitQueue(
        "image.saved", declare=False
    )
    image_save_failed_queue = faststream.rabbit.RabbitQueue(
        "image.save_failed", declare=False
    )

    imgur: Imgur
    storage: Storage

    @app.after_startup
    async def on_startup():
        nonlocal imgur
        imgur = await _initialize_imgur(exit_stack)

        nonlocal storage
        storage = await _initialize_storage(exit_stack, settings)

    @broker.subscriber(queue=image_requested_queue, exchange=exchange)
    async def download_image(event: ImageRequested) -> None:
        image_id = event.image_id
        try:
            contents = await imgur.download_image(image_id)
        except Exception:
            await broker.publish(
                queue=image_save_failed_queue,
                exchange=exchange,
                message=ImageSaveFailed(image_id=event.image_id),
            )
            return

        if contents is None:
            await broker.publish(
                queue=image_save_failed_queue,
                exchange=exchange,
                message=ImageSaveFailed(image_id=event.image_id),
            )
            return

        try:
            await storage.upload_image(event.image_id, contents=contents)
        except Exception:
            await broker.publish(
                queue=image_save_failed_queue,
                exchange=exchange,
                message=ImageSaveFailed(image_id=event.image_id),
            )
            return

        await broker.publish(
            queue=image_saved_queue,
            exchange=exchange,
            message=ImageSaved(image_id="0mtwnhm"),
        )

    @broker.subscriber(queue=image_saved_queue, exchange=exchange)
    async def persist_metadata(event: ImageSaved) -> None: ...

    @broker.subscriber(queue=image_saved_queue, exchange=exchange)
    async def persist_thumbnail(event: ImageSaved) -> None: ...

    @broker.subscriber(queue=image_saved_queue, exchange=exchange)
    async def notify_email(event: ImageSaved) -> None: ...

    @app.after_shutdown
    async def on_shutdown() -> None:
        await exit_stack.aclose()

    return app
