# Fetcher

The fetcher listens for `image.requested` events, fetches the requested image, stores it in S3-compatible storage, and announces the successful save.

In other words: RabbitMQ hands it a name, the internet hands it a picture, and MinIO gets custody.

## Prerequisites

### Rust

This project uses the **2024 Rust edition**.

[Install Rust](https://www.rust-lang.org/tools/install)

Verify the installation:

```bash id="n8s4q2"
rustc --version
cargo --version
```

Cargo is included with Rust and is used for dependency management, building, running, and formatting.


## Build

Build a development binary with:

```bash id="r2f7kn"
cargo build
```

The binary is generated at:

```text id="s8q3vx"
target/debug/fetcher
```

For an optimized release binary:

```bash id="m5c1zy"
cargo build --release
```

The resulting binary is:

```text id="v4n6jt"
target/release/fetcher
```

You can run the release binary directly:

```bash id="k7p2fb"
./target/release/fetcher
```

## Development

The fetcher needs access to:

* **RabbitMQ**, for consuming `image.requested` events and publishing `image.saved` events.
* **MinIO**, exposed through its S3-compatible API on `minio:9000`.

The service reads the following environment variables:

```text id="p2k7wm"
RABBITMQ_ROOT_USERNAME
RABBITMQ_ROOT_PASSWORD
MINIO_ROOT_USERNAME
MINIO_ROOT_PASSWORD
```

For example:

```bash id="j4v6rx"
export RABBITMQ_ROOT_USERNAME=guest
export RABBITMQ_ROOT_PASSWORD=guest
export MINIO_ROOT_USERNAME=minioadmin
export MINIO_ROOT_PASSWORD=minioadmin
```

Then start the service with:

```bash id="f1c9az"
cargo run
```

The fetcher connects to RabbitMQ at:

```text id="d7m3qp"
rabbitmq:5672
```

and MinIO at:

```text id="u5k2hs"
http://minio:9000
```

Those hostnames are the service names expected by the application. If you're running the fetcher directly on your machine rather than inside the project's service network, make sure those names resolve to the appropriate instances. `localhost` is not a synonym for “the other container,” no matter how much we might wish it were.

### Required RabbitMQ topology

The fetcher consumes from the `image.requested` queue and publishes to the `events` exchange.

The queue is consumed with the `fetcher` consumer name.

The incoming message must contain an `image_id`:

```json id="q6r1tc"
{
  "image_id": "abc1234"
}
```

When the image is successfully fetched and stored, the fetcher publishes:

```text id="x3m8vk"
image.saved
```

with the same `image_id`:

```json id="h9w2ld"
{
  "image_id": "abc1234"
}
```

The service does not create the RabbitMQ exchange or queue itself, so the surrounding infrastructure needs to provide them.

### Image storage

Images are stored in the `images` bucket using the `image_id` as the object key.

The bucket is created automatically if it does not already exist. One less thing to remember, which is frankly the sort of thing computers are supposed to be good at.

Images are fetched from:

```text
https://i.imgur.com/{image_id}.png
```

A missing image is treated as a normal miss rather than a fatal error. The service logs the miss and continues consuming events.

### Formatting

Format the entire project with:

```bash id="w3d8qm"
cargo fmt
```

To check formatting without modifying any files:

```bash id="a6r9kc"
cargo fmt -- --check
```

If `cargo fmt --check` complains, the code has entered into a disagreement with Rust's sense of aesthetics. Let `cargo fmt` settle it.
