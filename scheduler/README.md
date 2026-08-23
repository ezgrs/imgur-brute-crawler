# Scheduler

A small Go service that periodically asks RabbitMQ to schedule an image request.

It generates a random image ID and publishes an `image.requested` event to the `events` exchange. In production, the container delegates the repetition to `cron`, because apparently even tiny services occasionally need a metronome.

## Prerequisites

### Go

This project requires **Go 1.26.4**.

[Install Go](https://go.dev/doc/install)

Verify your installation:

```bash
go version
```

The project uses Go modules, so there is no separate dependency manager to install.

## Dependencies

Dependencies are managed with **Go Modules** through `go.mod` and `go.sum`.

Download the project dependencies with:

```bash
go mod download
```

To synchronize dependencies and update `go.sum` when necessary:

```bash
go mod tidy
```

## Build

Build the scheduler binary with:

```bash
go build -o scheduler .
```

This creates the executable at:

```text
./scheduler
```

## Development

The scheduler publishes an `image.requested` event to RabbitMQ, so a reachable RabbitMQ instance is required.

The application reads its credentials from:

```text
RABBITMQ_ROOT_USERNAME
RABBITMQ_ROOT_PASSWORD
```

For example:

```bash
export RABBITMQ_ROOT_USERNAME=guest
export RABBITMQ_ROOT_PASSWORD=guest
```

Then run the service:

```bash
go run .
```

### RabbitMQ hostname

The application currently connects to:

```text
amqp://<username>:<password>@rabbitmq:5672/
```

The hostname is hard-coded as `rabbitmq`.

That means `go run .` from your host machine will only work if `rabbitmq` resolves to the RabbitMQ instance you're running. If RabbitMQ is exposed on your local machine instead, the application will need to be adjusted to use the appropriate host.

When the scheduler runs successfully, it publishes an event shaped like:

```json
{
  "image_id": "aB3k91x"
}
```

The event is published to the `events` exchange using the routing key:

```text
image.requested
```

The service logs structured JSON to stdout.

A successful run looks roughly like:

```json
{
  "timestamp": "...",
  "level": "INFO",
  "message": "published event",
  "service": "scheduler",
  "image_id": "aB3k91x"
}
```

### Formatting

Format all Go source files with:

```bash
gofmt -w .
```

To check what would be changed without modifying anything:

```bash
gofmt -d .
```

## Docker

Build the image with:

```bash
docker build -t scheduler .
```

The RabbitMQ credentials still need to be provided to the container:

```bash
docker run \
  -e RABBITMQ_ROOT_USERNAME=guest \
  -e RABBITMQ_ROOT_PASSWORD=guest \
  scheduler
```

The container must also be able to resolve and reach the `rabbitmq` hostname.
