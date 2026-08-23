---
weight: 4
---
# Metadata Processor

The Metadata Processor is the one that takes a closer look.

When the Fetcher finds an image, somebody has to remember what the hell it actually is. How big is it? What are its dimensions? What kind of image is it? What does its content hash look like?

The Metadata Processor answers those questions and writes the answers down in PostgreSQL.

It doesn't keep another copy of the image. It doesn't transform it. It simply looks, takes notes, and puts the notes somewhere the rest of the system can find them.

## What does it do?

When an `image.saved` event arrives, the Metadata Processor uses the image ID to retrieve the original image from the `images` bucket.

It then extracts a small set of metadata:

* width
* height
* size in bytes
* MIME type
* SHA-256 hash

That metadata is stored in PostgreSQL alongside the image ID.

### Why does it calculate a hash?

Because two files can look like the same picture without necessarily being the same file.

The SHA-256 hash gives Imgurdex a compact fingerprint of the image contents. If the bytes change, the fingerprint changes too.

That makes the hash useful when you want to identify the exact contents of a file rather than merely knowing that an image exists under a particular ID.

It is, in other words, the Metadata Processor's way of saying:

*"I don't just know your name. I know your fingerprints."*

### What happens when the metadata is saved?

The metadata is written to PostgreSQL using the image ID as its key.

If that ID already exists, the stored metadata is updated rather than creating another row for the same image.

This means the database represents the image's current metadata rather than accumulating a small pile of increasingly confused copies of it.

## Implementation

The Metadata Processor is written in [Dart](https://dart.dev/).

Its code is organized around a few small abstractions: `Database`, `Imaging`, `Storage`, and `Listener`. The main processing flow doesn't need to know which PostgreSQL client, image parser, object-storage client, or message library is doing the actual work.

That's a clean-architecture-inspired approach: the use case depends on capabilities rather than concrete infrastructure. The application can say "download this image", "parse its metadata", and "save the result" without getting tangled up in the plumbing that makes those things happen.

The concrete implementations connect those abstractions to the actual infrastructure:

* **RabbitMQ** is consumed through [`dart_amqp`](https://pub.dev/packages/dart_amqp).
* **MinIO** is accessed through its S3-compatible API using the [`minio`](https://pub.dev/packages/minio) package.
* **PostgreSQL** is accessed through the [`postgres`](https://pub.dev/packages/postgres) package.
* Image dimensions are read with [`image_size_getter`](https://pub.dev/packages/image_size_getter).
* SHA-256 hashes are calculated with the [`crypto`](https://pub.dev/packages/crypto) package.

The service also applies PostgreSQL migrations on startup before it begins processing images, using the [`dbmigrator_psql`](https://pub.dev/packages/dbmigrator_psql) package.

Message consumption uses a dedicated `image.saved.metadata-processor` queue with manual acknowledgements and a prefetch of one message. Invalid messages are rejected, while successfully processed messages are acknowledged after the metadata has been saved.

The actual processing flow is deliberately uncomplicated: download, inspect, persist.

Which is probably exactly what a metadata processor ought to be doing. No grand adventure. Just a very diligent little clerk with access to an image archive.
