# Metadata Processor

The metadata processor listens for images that have been saved, downloads them from object storage, extracts their metadata, and writes the result to PostgreSQL.

It is the service that looks at a picture and asks the deeply important questions: *what are you, exactly, and why are you like this?*

## Prerequisites

### Dart

The project requires **Dart 3.11.5 or a compatible Dart 3 release**.

[Install Dart](https://dart.dev/get-dart)

Verify the installed version with:

```bash
dart --version
```

## Dependencies

Dependencies are managed with **Dart Pub**, using `pubspec.yaml`.

Install dependencies with:

```bash
dart pub get
```

The project does not require a globally installed dependency manager beyond the Dart SDK.

## Build

Compile the application to a native executable with:

```bash
dart compile exe bin/processor.dart -o processor
```

The resulting binary is generated at:

```text
./processor
```

You can then run it directly:

```bash
./processor
```

The generated executable is platform-specific. If you compile it on Linux, you get a Linux executable; Dart has not yet decided that every operating system should simply agree with us.

## Development

The processor requires access to PostgreSQL, RabbitMQ, and MinIO.

### Environment

Set the following environment variables before starting the application:

```text
POSTGRES_USERNAME
POSTGRES_PASSWORD
POSTGRES_DATABASE

RABBITMQ_ROOT_USERNAME
RABBITMQ_ROOT_PASSWORD

MINIO_ROOT_USERNAME
MINIO_ROOT_PASSWORD
```

The service connects to:

```text
PostgreSQL: postgres:5432
RabbitMQ:    rabbitmq:5672
MinIO:       minio:9000
```

These hostnames are configured by the application. When running the processor directly on your machine, make sure they resolve to the corresponding services.

### Database migrations

Database migrations live in:

```text
migrations/
```

The application applies migrations automatically when it starts.

The migration directory must therefore be available from the application's working directory. In particular, the service expects:

```text
./migrations
```

If you start the compiled executable from somewhere else, don't be surprised when PostgreSQL remains perfectly innocent while your application complains that it can't find its migrations.

### Run locally

Start the processor with:

```bash
dart run bin/processor.dart
```

The processor waits for image events and handles them as they arrive.

For each image, it:

1. Downloads the image from the `images` bucket in MinIO.
2. Extracts its metadata.
3. Stores that metadata in PostgreSQL.

If an individual step fails, the error is logged and processing continues rather than taking the entire service down with it.

### Formatting

Format the entire project with:

```bash
dart format .
```

To check formatting without modifying files:

```bash
dart format --output=none --set-exit-if-changed .
```

The latter is useful for CI or any other environment where “please format this for me” is slightly less desirable than “please tell me whether I have formatted it correctly.”
