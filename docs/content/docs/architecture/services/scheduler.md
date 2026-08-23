---
weight: 1
---

# Scheduler

The Scheduler is the part of Imgurdex that keeps the whole thing moving.

## What does it do?

Every time the Scheduler runs, it generates a seven-character ID using letters and numbers and publishes it as an `image.requested` event.

The event contains:

| Field      | Type   | Description                       |
| ---------- | ------ | --------------------------------- |
| `image_id` | string | The seven-character ID to look up |


For example:

```json
{
  "image_id": "a7Kx91Q"
}
```

That's the entire payload.

The Scheduler doesn't need to know whether that ID corresponds to an image, whether the image is interesting, or whether anyone will eventually care about it.

Its responsibility ends when the request has been published successfully.

### Why a random ID?

Because the Scheduler isn't trying to decide what should be found.

It simply produces another possible Imgur ID and lets the Fetcher figure out whether there is anything there.

This keeps the Scheduler completely unaware of Imgur's contents and gives the discovery process a little bit of randomness.

Most requests may lead nowhere, but that's fine.

The interesting ones are the ones that don't.

## When does it run?

The Scheduler runs once every minute.

Rather than keeping the Go process alive and implementing its own timer, the container uses `dcron` to schedule the executable:

```cron
* * * * * /app/scheduler
```

The container itself runs `crond` in the foreground, and every minute `cron` starts the Scheduler, which generates one ID, publishes one `image.requested` event, and exits.

The Scheduler is therefore not a long-running worker. **The container is long-running; the Scheduler itself is invoked once per minute.**

## Implementation

The Scheduler is implemented in [Go](https://go.dev/) using the [RabbitMQ AMQP client](https://pkg.go.dev/github.com/rabbitmq/amqp091-go).

Its implementation is intentionally small. The main responsibilities are separated into a few straightforward operations:

1. Create the logger.
2. Connect to RabbitMQ.
3. Open an AMQP channel.
4. Generate a seven-character ID.
5. Publish `image.requested`.
6. Log the result.
7. Exit.

There isn't much more to it.

And that's exactly how it should be.

The Scheduler doesn't need to understand images to start an image pipeline. It only needs to ask a very simple question:

> **“What if we looked here?”**

Then it hands that question to the rest of Imgurdex and gets out of the way.
