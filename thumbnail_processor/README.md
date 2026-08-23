# Thumbnail Processor

The thumbnail processor listens for images that have been saved, creates a thumbnail, and stores the result in object storage.

It consumes `image.saved.thumbnail-processor` events, fetches the original image from the `images` bucket, creates a thumbnail, and puts the result in the `thumbnails` bucket.

It is the service equivalent of looking at a 4K photograph and saying, “Lovely. Now make it smaller.”

## Prerequisites

### Python

The project requires **Python 3.13 or newer, below 4.0**.

[Download Python](https://www.python.org/downloads)

Verify the installed version:

```bash
python --version
```

### Poetry

The project uses **Poetry 2.x** for dependency management and packaging.

[Install Poetry](https://python-poetry.org/docs#installation)

Verify the installation:

```bash
poetry --version
```

## Dependencies

Install the project dependencies with:

```bash
poetry install
```

This installs both runtime and development dependencies into Poetry's managed environment.

To run commands inside that environment, either use `poetry run` or activate the environment:

```bash
poetry shell
```

If `poetry shell` is not available in your Poetry installation, use `poetry run` directly.

## Development

The processor requires access to RabbitMQ and MinIO.

### Environment

Set the following environment variables:

```text
RABBITMQ_ROOT_USERNAME
RABBITMQ_ROOT_PASSWORD

MINIO_ROOT_USERNAME
MINIO_ROOT_PASSWORD
```

RabbitMQ is expected at:

```text
rabbitmq:5672
```

MinIO is expected at:

```text
http://minio:9000
```

These addresses are configured by the application. If you're running the processor directly on your host rather than inside the service network, make sure the corresponding hostnames resolve correctly.

### Run locally

Start the processor with:

```bash
poetry run faststream run --factory processor.interfaces.faststream:create_app
```

The service starts a RabbitMQ consumer and waits for `image.saved` events on:

```text
image.saved.thumbnail-processor
```

Each event is expected to contain an `image_id`:

```json
{
  "image_id": "abc1234"
}
```

When an event arrives, the processor:

1. Downloads the original image from the `images` bucket.
2. Generates its thumbnail.
3. Stores the thumbnail in the `thumbnails` bucket using the same image ID.

The `thumbnails` bucket is created automatically if it does not already exist.

If thumbnail generation fails, the error is logged with the relevant `image_id`, and the consumer remains alive to deal with whatever disaster arrives next.

### Logging

The service writes structured JSON logs to stdout.

Each log entry includes the service name, timestamp, level, message, and (when available) the `image_id`.

That makes the logs reasonably pleasant to feed into whatever observability machinery is waiting downstream to turn them into graphs nobody looks at.

### Formatting

Format the Python source with:

```bash
poetry run black -l 80 src
```

To check formatting without modifying files:

```bash
poetry run black -l 80 --check src
```

Black is deliberately opinionated about formatting so that the rest of us don't have to be.
