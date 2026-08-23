---
weight: 2
---

# Fetcher

If the Scheduler is the part of Imgurdex that keeps knocking on doors, the Fetcher is the one who actually opens them.

It consumes `image.requested` events, goes to Imgur, checks whether the requested image exists, stores it when it does, and announces the discovery to the rest of the system.

This is the service where an innocent seven-character string finally becomes an actual image.

## What does it do?

The Fetcher listens for `image.requested` events from RabbitMQ.

For every event, it takes the `image_id` and requests the corresponding image from Imgur.

There are two possible outcomes:

1. If the image exists, the Fetcher downloads it, determines its content type, stores it in MinIO, and publishes an `image.saved` event.
2. Otherwise, the Fetcher records a miss and moves on.

This service is the boundary between the random world of Imgur and the more organized world of Imgurdex.

### What happens when it gets an event?

The input event contains a single piece of information:

```json id="q3g9te"
{
  "image_id": "a7Kx91Q"
}
```

The Fetcher parses the message and uses that ID to construct the image URL.

It doesn't need any additional context. No user information, no metadata, no elaborate request object.

Just an ID.

The Fetcher takes it from there.

### How does it find the image?

The Fetcher makes an HTTP request to Imgur using the image ID.

It deliberately disables automatic redirect handling because a particular redirect is how the Fetcher identifies a removed image.

When Imgur indicates that the requested image has been removed, the Fetcher treats it as a miss rather than trying to process it.

For a successful response, the image bytes are read into memory and passed to the storage step.

So the Fetcher's definition of success is pleasantly straightforward:

> **There are image bytes here. Keep them.**

### What happens to a successful image?

Once an image is found, the Fetcher stores the original bytes in the `images` bucket in MinIO.

The object's key is the image ID itself.

For example:

```text id="z6q1mm"
images/
└── a7Kx91Q
```

The Fetcher also determines a basic content type from the image's bytes before storing it.

It currently recognizes JPEG, GIF, and PNG signatures. Anything else falls back to `application/octet-stream`.

This means the storage layer doesn't have to guess what kind of file it just received.

### What event does it publish?

After successfully saving the image, the Fetcher publishes an `image.saved` event.

The payload is deliberately small:

```json id="y6q4u8"
{
  "image_id": "a7Kx91Q"
}
```

That's all the downstream services need.

They know an image exists and they know its ID. If they need the actual image, they can retrieve it from MinIO.

The Fetcher therefore doesn't send the image through RabbitMQ. Nobody wants a message broker carrying around a 14 MB vacation photo just because someone wanted to generate a thumbnail.

### Does it create the storage bucket?

Yes.

When it starts, the Fetcher checks whether the `images` bucket exists in MinIO.

If it doesn't, it creates it.

This means a fresh Imgurdex installation doesn't require someone to manually open the MinIO console and create a bucket before the first image can be saved.

The Fetcher arrives, checks the cupboard, and builds the cupboard if necessary.
container communication. The host-facing MinIO port is a separate concern.


## Implementation

The Fetcher is written in [Rust](https://rust-lang.org/) and uses asynchronous I/O for its RabbitMQ and HTTP work.

The implementation is split into a few focused responsibilities:

* RabbitMQ connection and consumption
* S3/MinIO access
* Message parsing
* Image fetching
* Content-type detection
* Event publishing
* Event handling
* Structured logging

The main loop waits for deliveries from RabbitMQ and handles them one at a time.

There is a satisfying simplicity to the Fetcher.

The Scheduler says **“look here.”**

The Fetcher looks.

If there's nothing there, it moves on.

If there is, it puts the image somewhere safe and tells everyone else:

**“Found one.”**

And that is where the rest of Imgurdex wakes up.
