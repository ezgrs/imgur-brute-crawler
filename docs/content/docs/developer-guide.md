---
weight: 3
params:
  bookFlatSection: true
---

# Developer Guide

So, you've read the docs, understand the machine, and have decided to put your hands inside it.

Good.

This page is less about explaining how Imgurdex works and more about answering the practical question:

> **"If I want to change this particular thing, where do I actually go?"**

There is no grand development framework hiding underneath it. Most changes are pleasantly local. Find the service responsible for the behavior, change it, rebuild the relevant container, and let the machine get back to work.

## Where is everything?

The repository is organized around the services themselves:

```text
imgurdex/
├── assets/
├── fetcher/
├── metadata_processor/
├── notifier/
├── scheduler/
├── thumbnail_processor/
├── docker-compose.yml
└── README.md
```

The service directories contain their own source code and build configuration.

The infrastructure configuration lives under `assets/`:

```text
assets/
├── alloy/
├── grafana/
├── loki/
└── rabbitmq/
```

### Where is the Scheduler code?

```text
scheduler/
├── Dockerfile
├── go.mod
├── go.sum
└── main.go
```

The Scheduler is small enough that its main behavior currently lives in `main.go`.

If you're changing what the Scheduler does, this is your first stop.

### Where is the Fetcher code?

```text
fetcher/
├── Cargo.toml
├── Dockerfile
└── src/
    ├── logging.rs
    └── main.rs
```

The Fetcher is similarly compact. Its application code lives under `src/`.

### Where is the Thumbnail Processor code?

```text
thumbnail_processor/
├── Dockerfile
├── pyproject.toml
├── poetry.lock
├── README.md
└── src/
    └── processor/
        ├── application/
        ├── infrastructure/
        └── interfaces/
```

This service has a little more structure.

The `application/` directory contains the use cases and ports, `infrastructure/` contains concrete implementations such as storage and imaging, and `interfaces/` contains the messaging interface.

If you're changing **what the processor does**, start in `application/`.

If you're changing **how it talks to MinIO or processes images**, you're probably heading into `infrastructure/`.

If you're changing **how it receives events**, look in `interfaces/`.

The architecture is trying to tell you where to look. It's generally polite like that.

### Where is the Metadata Processor code?

```text
metadata_processor/
├── bin/
│   └── processor.dart
├── lib/
│   ├── models/
│   └── services/
├── migrations/
├── pubspec.yaml
└── Dockerfile
```

The models live under `lib/models/`, while the service abstractions and implementations live under `lib/services/`.

Database schema changes belong in `migrations/`.

### Where is the Notifier code?

```text
notifier/
├── app/
├── gradle/
├── gradle.properties
├── gradlew
├── gradlew.bat
└── settings.gradle.kts
```

The application source is under:

```text
notifier/app/src/main/kotlin/org/example/
```

The current entry point is `App.kt`.

## How do I change how often Imgurdex looks for images?

The Scheduler is invoked periodically by cron inside its container.

If you want to change the current schedule, look at the Scheduler's Dockerfile for the cron entry:

```dockerfile
RUN echo '* * * * * /app/scheduler > /proc/1/fd/1 2>&1' > /etc/crontabs/root
```

The five fields are the usual cron schedule:

```text
* * * * *
│ │ │ │ │
│ │ │ │ └── day of week
│ │ │ └──── month
│ │ └────── day of month
│ └──────── hour
└────────── minute
```

For example, to run the Scheduler every two minutes:

```dockerfile
RUN echo '*/2 * * * * /app/scheduler > /proc/1/fd/1 2>&1' > /etc/crontabs/root
```

Then rebuild the Scheduler image so the changed Dockerfile is actually used.

Cron is not a database. It will not notice that you changed the Dockerfile out of respect for your intentions.

## How do I get my images out of MinIO?

The images are yours.

You found them fair and square.

Do **not** reach directly into the `minio_data` Docker volume and start copying files around. MinIO owns that storage layout, and its internal representation is not the same thing as "a directory containing `jpg`s that I can casually rummage through."

Use MinIO's S3 API instead.

For a one-off download, an S3-compatible client such as MinIO's `mc` is a good fit. For example, after configuring an alias pointing at the local MinIO instance, you can mirror the archive to a local directory:

```bash
mc mirror minio/images ./images
```

The exact alias and credentials depend on your local environment.

If downloading the archive becomes something you do regularly, **make a small script for it** rather than turning a one-off shell command into tribal knowledge.

Something like:

```text
scripts/
└── download-images.sh
```

That gives you a repeatable developer operation without coupling yourself to MinIO's internal volume layout.

The rule is simple:

**talk to MinIO as an object store; don't rummage through its furniture.**

## How do I change the RabbitMQ password?

RabbitMQ's credentials appear in more than one place, so changing the password means keeping those pieces consistent.

The user definition lives in:

```text
assets/rabbitmq/definitions.json
```

The password is stored there as a RabbitMQ password hash rather than as plaintext:

```json
{
  "name": "root",
  "password_hash": "Ehf0WDK4CHqgkEuRwHfubECj+Po3UJCvDNwMjsVVOrunalw2",
  "hashing_algorithm": "rabbit_password_hashing_sha256",
  "tags": "administrator"
}
```

To generate a new hash, use RabbitMQ's `hash_password` command.

For example:

```bash
docker exec -it rabbitmq rabbitmqctl hash_password 'your-new-password'
```

RabbitMQ will print the resulting hash. Put that value into `password_hash` in `definitions.json`.

You also need to update the corresponding `RABBITMQ_ROOT_PASSWORD` value in your environment configuration, because the application services use that password when connecting to RabbitMQ.

So the change is:

```text
new password
    │
    ├──► RABBITMQ_ROOT_PASSWORD
    │
    └──► hash_password
             │
             └──► assets/rabbitmq/definitions.json
```

Keep the plaintext password out of `definitions.json`. That's what the hash is there for.

And after changing the credentials, restart/recreate the relevant containers so the new configuration is actually being used.

## How do I change what happens when an image is saved?

Start with the event.

If you're changing an existing reaction to `image.saved`, find the service responsible for that reaction:

* thumbnails → `thumbnail_processor/`
* metadata → `metadata_processor/`
* email → `notifier/`

If you're adding an entirely new reaction, the natural shape is a **new consumer with its own queue** rather than modifying the Fetcher to know about your new behavior.

The Fetcher announces that an image was saved.

Your new service decides what that means to it.

That's the whole point of the event boundary.

## How do I change how thumbnails are generated?

Look in:

```text
thumbnail_processor/src/processor/
```

The thumbnail generation behavior belongs in the application/imaging side of that service, while the MinIO interaction belongs to its storage infrastructure.

If you're changing dimensions, format, quality, orientation handling, or other image transformations, this is the service to modify.

The Fetcher should not suddenly become responsible for thumbnails just because you happened to be thinking about thumbnails while looking at its code.

That way lies spaghetti.

## How do I change the metadata stored for an image?

Start with the Metadata Processor.

If you're changing the information extracted from an image, look at its imaging service and metadata model:

```text
metadata_processor/lib/models/
metadata_processor/lib/services/
```

If the new field needs to be persisted, the database layer and migration need to change as well:

```text
metadata_processor/migrations/
```

In other words, changing metadata usually has two parts:

**what do we know?**

and

**where do we store it?**

Don't forget the second one. Databases are famously bad at storing fields that nobody added to the schema.

## How do I change the notification email?

Look in the Notifier.

Its email construction and SMTP configuration are handled there. The SMTP connection details come from environment variables, so changing credentials or the SMTP server generally doesn't require changing the Kotlin source.

If you want to change the actual email behavior (subject, attachment naming, recipients, or MIME structure), that belongs in the Notifier's application code.

## How do I change the RabbitMQ topology?

The broker configuration lives under:

```text
assets/rabbitmq/
├── rabbitmq.conf
└── definitions.json
```

The exchange, queues, and bindings are defined in `definitions.json`.

If you add a new event or consumer, this is one of the places you'll need to consider.

For an `image.saved` consumer, for example, the usual pattern is a dedicated queue bound to the `events` exchange with the `image.saved` routing key.

The important part is not merely adding code that listens for a message.

The message has to have somewhere to go.

## What if I want to add a completely new service?

Then you're officially having fun.

A new service should get its own directory at the repository root, its own build configuration and Dockerfile, and its own responsibility.

If it reacts to an existing event, give it its own queue rather than making an existing consumer share its queue.

If it needs a new event, add the event to the RabbitMQ topology and document its schema.

If it needs persistent data, decide whether that data belongs in MinIO or PostgreSQL before inventing a new storage mechanism just because it looked interesting at 2 AM.

And, most importantly, give the new service a job that can be described in one sentence.

If you need three paragraphs to explain what it does, you may have accidentally created three services.

## What else might I need to change?

These are some of the more common places you might eventually find yourself poking:

| I want to...                          | Start here                                       |
| ------------------------------------- | ------------------------------------------------ |
| Change how often images are requested | Scheduler Dockerfile                             |
| Change Imgur fetching behavior        | `fetcher/`                                       |
| Change thumbnail generation           | `thumbnail_processor/`                           |
| Change extracted metadata             | `metadata_processor/`                            |
| Change the database schema            | `metadata_processor/migrations/`                 |
| Change notification behavior          | `notifier/`                                      |
| Add a consumer to an event            | New/existing service + RabbitMQ definitions      |
| Change an event's routing             | `assets/rabbitmq/definitions.json`               |
| Change RabbitMQ credentials           | Environment + `assets/rabbitmq/definitions.json` |
| Export images from the archive        | MinIO S3 API / a small utility script            |
| Change log collection                 | `assets/alloy/`                                  |
| Change log storage                    | `assets/loki/`                                   |
| Change Grafana provisioning           | `assets/grafana/`                                |

This is not a map of every file in the repository.

It's a map of **where to start looking**.

That's usually all you need.
