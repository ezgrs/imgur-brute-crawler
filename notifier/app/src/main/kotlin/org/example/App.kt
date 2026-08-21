package org.example

import aws.sdk.kotlin.runtime.auth.credentials.StaticCredentialsProvider
import aws.sdk.kotlin.services.s3.S3Client
import aws.sdk.kotlin.services.s3.model.GetObjectRequest
import aws.smithy.kotlin.runtime.content.toByteArray
import aws.smithy.kotlin.runtime.net.url.Url
import com.fasterxml.jackson.databind.PropertyNamingStrategies
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import com.rabbitmq.client.ConnectionFactory
import jakarta.activation.DataHandler
import jakarta.mail.Authenticator
import jakarta.mail.Message
import jakarta.mail.PasswordAuthentication
import jakarta.mail.Session
import jakarta.mail.Transport
import jakarta.mail.internet.InternetAddress
import jakarta.mail.internet.MimeBodyPart
import jakarta.mail.internet.MimeMessage
import jakarta.mail.internet.MimeMultipart
import jakarta.mail.util.ByteArrayDataSource
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import java.util.Properties

data class ImageSavedEvent(
    val imageId: String,
)

fun sendEmail(
    imageId: String,
    contentBytes: ByteArray,
    contentType: String,
) {
    val host = System.getenv("SMTP_HOST")
    val port = System.getenv("SMTP_PORT")
    val username = System.getenv("SMTP_USERNAME")
    val password = System.getenv("SMTP_PASSWORD")
    val from = System.getenv("SMTP_FROM")

    val properties =
        Properties().apply {
            put("mail.smtp.host", host)
            put("mail.smtp.port", port)
            put("mail.smtp.auth", "true")
            put("mail.smtp.starttls.enable", "true")
            put("mail.smtp.starttls.required", "true")
        }

    val session =
        Session.getInstance(
            properties,
            object : Authenticator() {
                override fun getPasswordAuthentication() = PasswordAuthentication(username, password)
            },
        )

    val message =
        MimeMessage(session).apply {
            setFrom(InternetAddress(from))
            setRecipients(
                Message.RecipientType.TO,
                InternetAddress.parse(username),
            )
            setSubject("An Imgur image ($imageId) was just found!", "UTF-8")

            setContent(
                MimeMultipart("mixed").apply {
                    val attachment = MimeBodyPart()
                    attachment.dataHandler =
                        DataHandler(
                            ByteArrayDataSource(contentBytes, contentType),
                        )
                    attachment.fileName = imageId
                    attachment.disposition = jakarta.mail.Part.ATTACHMENT

                    addBodyPart(attachment)
                },
            )
        }

    Transport.send(message)
}

fun main() {
    val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    val mapper =
        jacksonObjectMapper()
            .setPropertyNamingStrategy(PropertyNamingStrategies.SNAKE_CASE)

    val s3 =
        S3Client {
            region = "us-east-1"
            endpointUrl = Url.parse("http://minio:9000")
            forcePathStyle = true
            credentialsProvider =
                StaticCredentialsProvider {
                    accessKeyId = System.getenv("MINIO_ROOT_USERNAME")
                    secretAccessKey = System.getenv("MINIO_ROOT_PASSWORD")
                }
        }

    val f =
        ConnectionFactory().apply {
            host = "rabbitmq"
            port = 5672
            username = System.getenv("RABBITMQ_ROOT_USERNAME")
            password = System.getenv("RABBITMQ_ROOT_PASSWORD")
        }

    f.newConnection().use { c ->
        c.createChannel().use { ch ->
            ch.basicConsume(
                "image.saved.notifier",
                true,
                { _, m ->
                    val json = String(m.body)
                    val event: ImageSavedEvent = mapper.readValue(json)

                    scope.launch {
                        s3.getObject(
                            GetObjectRequest {
                                this.bucket = "images"
                                this.key = event.imageId
                            },
                        ) { response ->
                            sendEmail(
                                event.imageId,
                                response.body?.toByteArray() ?: ByteArray(0),
                                response.contentType ?: "application/octet-stream",
                            )
                        }
                    }
                },
                {},
            )
            Thread.currentThread().join()
        }
    }
}
