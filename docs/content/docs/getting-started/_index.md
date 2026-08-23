---
weight: 1
params:
  bookFlatSection: true
---

# Getting started

Getting Imgurdex running should not require a weekend, three monitors, or a sacrificial Raspberry Pi.

The project is designed to run as a Docker Compose stack. Once the environment is configured, the whole thing can be started with a single command.

## Prerequisites

You only need:

* [Docker](https://www.docker.com/get-started/) with Docker Compose support
* [Git](https://git-scm.com/install/), if you're cloning the repository

That's it. You don't need Go, Rust, Python, Dart, Kotlin, PostgreSQL, RabbitMQ, or MinIO installed on your machine. Those things have jobs to do, and Docker can give them a place to do them.

## Get the project

Clone the repository and enter it:

```bash
git clone https://github.com/ezgrs/imgurdex
cd imgurdex
```

If you already have the source code, skip this part. We won't tell anyone.

## Configure the environment

Imgurdex keeps its local configuration in a `.env` file. The repository includes `.env.example` as a starting point, so create your local configuration from it:

```bash
cp .env.example .env
```

Then open `.env` and fill in the values you want to use.

The values are grouped by the service or concern they configure.

### `DOCKER_*`

These are the ports exposed from the Docker containers to your local machine.

Think of them as the doors into the stack. The services can communicate with each other inside Docker without these ports being exposed, but these variables let you decide which ports you want to use from `localhost`.

For example, the MinIO API, MinIO console, PostgreSQL, RabbitMQ, RabbitMQ management console, and Grafana each get their own local port.

If a port is already being used on your machine, change it here rather than starting a small argument with whatever is currently occupying it.

### `MINIO_*`

These configure the credentials for MinIO, which is used by Imgurdex for object storage.

The username and password are used by the storage service and the components that need to access it.

For local development, choose values that are convenient for you. This is a development environment, not the vault containing the nuclear launch codes.

### `POSTGRES_*`

These configure the PostgreSQL database used by Imgurdex.

They define the database credentials and the name of the database that should be created for the project.

The metadata processor uses PostgreSQL to persist information about the images it processes.

### `RABBITMQ_*`

These configure the RabbitMQ credentials.

RabbitMQ is the message broker connecting the different parts of Imgurdex. Services publish and consume events through it instead of having to call each other directly.

### `GRAFANA_*`

These configure the credentials for Grafana.

Grafana is included for observing the system and its metrics. The credentials here are used to access its interface.

You don't need Grafana to make the image pipeline work, but it's useful when you want to see what the system is doing instead of simply hoping everything is fine.

### `SMTP_*`

These configure the SMTP server used by the notifier.

The notifier uses these settings to send email when an image is saved.

If you don't configure SMTP, the rest of the system can still be useful, but the email notification part won't have anywhere to send its mail. The internet has enough email already, so this is probably for the best until you're ready.

## Start Imgurdex

Once `.env` is configured, start the entire stack:

```bash
docker compose up
```

Docker Compose will build the Imgurdex services, start their dependencies, and connect everything together.

If you don't particularly enjoy watching container logs scroll past your screen:

```bash
docker compose up -d
```

The `-d` option starts the stack in the background.

You can check the running services with:

```bash
docker compose ps
```

And if you want to see what everyone has been up to:

```bash
docker compose logs -f
```

When you've seen enough images for one day:

```bash
docker compose down
```

This stops and removes the containers and network created by Compose.

Your persistent data is kept in the configured Docker volumes, so bringing the stack down does not mean throwing the archive into the void.

When you're ready to continue:

```bash
docker compose up
```

And Imgurdex gets back to work.

## What's next?

If everything started successfully, you now have the complete Imgurdex stack running locally.

The next useful place to go is the **Architecture** section, where the individual services and the events connecting them are explained.

Or, if you prefer the more entertaining option, leave it running for a while and see what it finds.
