---
weight: 3
---
# Thumbnail Processor

The Thumbnail Processor has a fairly modest ambition: take a perfectly good image and make it smaller.

It listens for `image.saved` events, fetches the original image from storage, creates a thumbnail, and puts the result back into object storage. It doesn't modify the original, and it doesn't need to know anything about where the image came from or who might want the thumbnail afterward.

An image was found. Now there is a smaller image. Life is good.

## What does it do?

When an `image.saved` event arrives, the processor receives the image ID and gets to work.

It:

1. Downloads the original image from the `images` bucket.
2. Creates a thumbnail no larger than **256 × 256** pixels.
3. Corrects the image orientation using its EXIF data.
4. Converts the result to JPEG.
5. Stores the thumbnail in the `thumbnails` bucket using the same image ID.

The original stays exactly where it was. The thumbnail gets its own object and its own little reason to exist.

The processor doesn't send the thumbnail anywhere else and doesn't publish another event when it's finished. It does its job and gets out of the way.

### How is the thumbnail made?

The image is first corrected according to its EXIF orientation, because photographs have occasionally decided that "portrait" is something best represented by a tiny note hidden inside the file.

It is then resized while keeping its aspect ratio, with neither dimension exceeding **256 pixels**.

The result is stored as a JPEG. Images that carry transparency are converted to RGB first, since JPEG isn't particularly interested in carrying an alpha channel around.

The goal isn't to produce a perfect replacement for the original. It's a lightweight representation that is cheaper and more convenient to work with.

### Why is the thumbnail stored separately?

Because the thumbnail and the original are different things with different jobs.

The original is the archive. The thumbnail is the quick glance.

Keeping them in separate buckets means consumers can use the smaller representation without having to download the original every time. It also means the Thumbnail Processor doesn't need to know anything about whatever eventually uses those thumbnails.

It makes one transformation and leaves the rest of the system to mind its own business.

## Implementation

The service is written in [Python](https://www.python.org/) and uses [Poetry](https://python-poetry.org/) for dependency management.

The code follows a small clean-architecture-inspired separation between the application logic and its infrastructure.

The thumbnail generation use case depends on abstract `Imaging` and `Storage` ports rather than directly depending on the concrete libraries or storage client. The infrastructure layer provides the actual implementations: `PillowImaging` handles image manipulation, while `S3Storage` handles object storage.

The service uses [`FastStream`](https://pypi.org/project/faststream/) to consume RabbitMQ messages and [`aioboto3`](https://pypi.org/project/aioboto3/) to communicate with the S3-compatible MinIO API.

Image processing is performed with [`Pillow`](https://pypi.org/project/pillow/). The synchronous image manipulation is moved to a worker thread so it doesn't block the asynchronous event-processing loop.

At startup, the service establishes its RabbitMQ and MinIO connections and ensures the `thumbnails` bucket exists. Configuration is provided through environment-backed settings.

The result is a service with a small application core and fairly replaceable infrastructure. The use case doesn't particularly care that today it's Pillow talking to MinIO. That's infrastructure's problem, and infrastructure can keep it.
