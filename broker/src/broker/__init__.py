import contextlib

import faststream
import faststream.rabbit
import httpx
import pydantic

from broker.services.http_client import check_imgur_resource


class ImageRequested(pydantic.BaseModel):
    image_id: str


class ImageFound(pydantic.BaseModel):
    image_id: str


def create_app() -> faststream.FastStream:
    exit_stack = contextlib.AsyncExitStack()

    broker = faststream.rabbit.RabbitBroker(
        url="amqp://root:root@localhost:5672",
    )
    app = faststream.FastStream(broker)
    exchange = faststream.rabbit.RabbitExchange("events")
    client: httpx.AsyncClient

    @app.after_startup
    async def on_startup():
        nonlocal client
        client = await exit_stack.enter_async_context(
            httpx.AsyncClient(
                base_url=httpx.URL(scheme="https", host="i.imgur.com"),
            )
        )
        await broker.publish(
            exchange=exchange,
            routing_key="image.requested",
            message=ImageRequested(image_id="0mtwnhm"),
        )

    @broker.subscriber("image.requested", exchange=exchange)
    async def on_image_requested(event: ImageRequested) -> None:
        has_resource = await check_imgur_resource(client, id=event.image_id)
        if not has_resource:
            return
        await broker.publish(
            exchange=exchange,
            routing_key="image.found",
            message=ImageFound(image_id="0mtwnhm"),
        )

    @broker.subscriber("image.found", exchange=exchange)
    async def on_image_found(event: ImageFound) -> None: ...

    @app.after_shutdown
    async def on_shutdown() -> None:
        await exit_stack.aclose()

    return app
