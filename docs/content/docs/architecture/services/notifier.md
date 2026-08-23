---
weight: 5
---
# Notifier

The Notifier is the service that gets excited when Imgurdex finds something.

Most of the system is content to quietly process whatever turns up. The Notifier, however, feels that a discovery should probably be shared with a human being. When an image is saved, it retrieves the original from storage and sends it by email as an attachment.


## What does it do?

The Notifier listens for `image.saved` events.

When one arrives, it takes the image ID from the event and uses it to retrieve the original image from the `images` bucket. It then sends that image as an email attachment.

The email includes a subject containing the image ID, and the attachment uses the image's content type to choose a familiar file extension when possible.

So the whole journey is pleasantly short: image found, image retrieved, email sent.

## Implementation

The Notifier is written in [Kotlin](https://kotlinlang.org/) and uses [Gradle](https://gradle.org/) with Kotlin DSL (_build.gradle.kts_) for its build configuration.

The service uses the [RabbitMQ Java client](https://mvnrepository.com/artifact/com.rabbitmq/amqp-client) to consume messages from the `image.saved.notifier` queue. Incoming JSON is deserialized into an `ImageSavedEvent`, with [Jackson](https://mvnrepository.com/artifact/com.fasterxml.jackson.module/jackson-module-kotlin) configured to use snake_case property names so the `image_id` event field maps naturally to the Kotlin model.

For object storage, it uses the [AWS SDK for Kotlin and its S3 client](https://mvnrepository.com/artifact/aws.sdk.kotlin/s3). The client is pointed at the local MinIO instance rather than AWS itself, using MinIO's S3-compatible API. The image is retrieved using the ID from the event.

Email delivery is handled through [Jakarta Mail](https://mvnrepository.com/artifact/org.eclipse.angus/angus-mail). The service creates an authenticated SMTP session using the configured SMTP host, port, username, password, and sender address. STARTTLS is required, and the recipient is the configured SMTP username.

The retrieved image bytes are attached directly to the MIME email. The attachment's filename is based on the image ID, with `.jpg`, `.png`, or `.gif` added for the corresponding content types. Unknown types are left without an extension.

The RabbitMQ consumer acknowledges messages automatically when they are delivered. Once a message is received, the actual image retrieval and email work is launched on an I/O-oriented coroutine scope, allowing the RabbitMQ consumer thread to hand the work off rather than performing the entire operation inline.

There is deliberately very little application logic here. The service is essentially an adapter between three things: an event arriving from RabbitMQ, an object being retrieved from MinIO, and an email leaving through SMTP.

Which feels appropriate.
