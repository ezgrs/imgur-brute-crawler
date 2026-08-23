---
weight: 1
---

# Events

Imgurdex services don't spend their days calling each other up to ask what everyone else is doing.

They leave notes.

An event is a small message describing something that happened in the system. A service publishes it, interested services listen for it, and everyone gets to carry on with their own work.

There are only two events in Imgurdex:

* `image.requested`: someone should go check an ID.
* `image.saved`: someone actually found an image.

That's the whole conversation.

The interesting part is what happens after the second one.


## What is an `image.requested` event?

`image.requested` is the beginning of an image hunt.

The Scheduler generates a random 7-character alphanumeric image ID and publishes an event containing that ID.

```json
{
  "image_id": "abc1234"
}
```

The event doesn't contain an image, a URL, or instructions about what to do with the result. It simply says:

> Someone should go look for this image.

The Fetcher is the service interested in that particular request. It receives the ID, asks Imgur about it, and decides whether there is actually anything worth saving.

If there isn't, the story ends there. No `image.saved` event is produced, because there was nothing to save.

## What is an `image.saved` event?

`image.saved` means the hunt actually turned something up.

The Fetcher publishes it after successfully saving an image to the `images` bucket in MinIO.

Its payload is deliberately tiny:

```json
{
  "image_id": "abc1234"
}
```

That's all the consumers need.

They already know where the original image lives; the event only needs to tell them which one appeared.

The Thumbnail Processor can make its smaller version. The Metadata Processor can inspect it and record what it finds. The Notifier can retrieve it and send it to a human.

Three reactions to one event, without the Fetcher having to coordinate any of them.

## Why doesn't an event contain the actual image?

Because RabbitMQ is carrying a message, not a suitcase.

The events contain identifiers, while the actual image bytes live in MinIO. This keeps the event messages small and gives object storage responsibility for the thing it is actually good at storing.

It also means consumers can retrieve the image when they need it instead of forcing the publisher to package the entire image into every message.

The event says *what happened*.

MinIO holds *what was found*.

A surprisingly useful division of labor.

## How does `image.saved` reach three different services?

RabbitMQ uses the `events` topic exchange as the meeting point.

The three consumers each have their own durable queue:

```text
image.saved.thumbnail-processor
image.saved.metadata-processor
image.saved.notifier
```

All three queues are bound to the `events` exchange using the `image.saved` routing key.

That means a single `image.saved` publication is delivered independently to all three queues.

This distinction matters.

The services are not competing for the same message. The Thumbnail Processor doesn't consume the message and accidentally steal it from the Metadata Processor. Each service gets its own copy through its own queue.

Everyone gets the memo.

Nobody has to pass it around.

## Where does RabbitMQ fit in?

RabbitMQ is the message backbone connecting the services.

The `events` exchange is durable and uses the **topic** exchange type. The queues consuming from it are durable as well, so the event topology is part of the persistent runtime configuration rather than something that exists only while the containers happen to be awake.

The exchange doesn't know what an image is.

The queues don't know why an image was saved.

RabbitMQ is mostly concerned with the wonderfully boring job of making sure messages get from publishers to the queues that are interested in them.

Which is exactly what you want from the mailroom.
