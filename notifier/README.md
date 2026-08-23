# Notifier

The notifier waits for an image to be saved, retrieves it from object storage, and sends it by email.

It is, essentially, the final stage of the pipeline: once an image has survived the journey through RabbitMQ, Imgur, and MinIO, this service arrives with a tiny envelope and says, “Good news. You have mail.”

## Prerequisites

### Java

The project requires **Java 21**.

[Install Java](https://adoptium.net/temurin/releases/?version=21)

Verify your installation:

```bash
java --version
```

The build is configured to use Java 21 through the Gradle toolchain, so having another JDK installed is not necessarily a problem.

## Dependencies

Dependencies are managed by **Gradle**.

The Gradle Wrapper handles the Gradle version used by the project, so prefer `./gradlew` over a globally installed `gradle` command. Reproducibility is a lovely thing, particularly when it means nobody has to ask which version of Gradle Dave happened to have installed in 2023.

## Build

Build the application with:

```bash
./gradlew build
```

The application JAR is generated under:

```text
app/build/libs/
```

To build the executable distribution JAR:

```bash
./gradlew shadowJar
```

The resulting fat JAR is generated under:

```text
app/build/libs/
```

The Shadow JAR contains the application's runtime dependencies, making it the appropriate artifact when you want to run the application without assembling the classpath yourself.

## Development

The notifier needs access to RabbitMQ, MinIO, and an SMTP server.

### Environment

Set the following environment variables before starting the application:

```text
RABBITMQ_ROOT_USERNAME
RABBITMQ_ROOT_PASSWORD

MINIO_ROOT_USERNAME
MINIO_ROOT_PASSWORD

SMTP_HOST
SMTP_PORT
SMTP_USERNAME
SMTP_PASSWORD
SMTP_FROM
```

The service expects RabbitMQ at:

```text
rabbitmq:5672
```

and MinIO at:

```text
http://minio:9000
```

Those addresses are configured by the application itself. If you're running the notifier directly on your machine, rather than from the same service network as RabbitMQ and MinIO, make sure `rabbitmq` and `minio` resolve to the appropriate hosts.

### SMTP

SMTP is used to deliver the notification email.

The SMTP connection requires authentication and STARTTLS. `SMTP_FROM` determines the sender address, while `SMTP_USERNAME` is also used as the recipient address.

The subject of the notification identifies the image that was found.

The image itself is attached to the email using the content type reported by object storage. JPEG, PNG, and GIF files receive their corresponding file extensions; other content types are left without one.

### RabbitMQ

The notifier consumes from:

```text
image.saved.notifier
```

Messages are expected to contain an `image_id`:

```json
{
  "image_id": "abc1234"
}
```

For each event, the notifier retrieves the corresponding object from the `images` bucket in MinIO and sends it as an email attachment.

The consumer uses automatic acknowledgement, so once RabbitMQ delivers the message, the message is considered handled. There is no elaborate ceremony here: if the service has received it, RabbitMQ considers it received.

### Run locally

Start the application with:

```bash
./gradlew :app:run
```

The application stays running and waits for `image.saved.notifier` events.

For a local setup, make sure RabbitMQ, MinIO, and the SMTP server are reachable before starting the notifier. Otherwise the notifier will have all the enthusiasm of a postman with no address.

### Formatting

Format the Kotlin code with:

```bash
./gradlew ktlintFormat
```

Check formatting without modifying files:

```bash
./gradlew ktlintCheck
```

Make sure the Kotlin code compiles:

```bash
./gradlew compileKotlin
```
