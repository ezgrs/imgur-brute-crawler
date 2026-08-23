---
weight: 2
---

# Services

Imgurdex is made of a handful of small services, each with a job to do and, ideally, no interest in anyone else's job.

They communicate through events rather than calling each other directly. One service finds an image, another stores it, and several others quietly notice that something interesting has happened and do their own thing with it. Nobody needs to know how the others work. They just need to agree on what happened.

That makes the system a little less like a single application and a little more like a small workshop: messages come in, work gets done, and everyone gets out of the way.

## Scheduler

The Scheduler is the one that keeps looking.

Every so often, it generates a random 7-character alphanumeric ID and sends an `image.requested` event into RabbitMQ. It doesn't fetch anything, inspect anything, or make any assumptions about what might be behind the ID. It just knocks on another door.

Sometimes someone answers.

## Fetcher

The Fetcher opens the door.

It listens for `image.requested` events, asks Imgur about the requested ID, and checks whether there is actually an image there. If there is, it saves the original image to MinIO and announces the discovery with an `image.saved` event.

If there isn't an image, nothing particularly dramatic happens. No event, no complaint, no ceremony. The Fetcher moves on to the next door.

## Thumbnail Processor

The Thumbnail Processor gets interested when an image has actually been found.

It listens for `image.saved`, retrieves the original image from MinIO, creates a lightweight thumbnail, and puts that thumbnail back into object storage.

## Metadata Processor

The Metadata Processor takes notes.

When an `image.saved` event arrives, it retrieves the original image from MinIO and examines it for useful details such as its hash, dimensions, and size. Those details are then stored in PostgreSQL.

The image itself stays in object storage. PostgreSQL gets the paperwork.

## Notifier

The Notifier is the service that tells someone when something turns up.

It listens for `image.saved`, retrieves the corresponding original image from MinIO, and sends it by email.
