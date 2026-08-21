package org.example

import com.fasterxml.jackson.databind.PropertyNamingStrategies
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import com.rabbitmq.client.ConnectionFactory
import jakarta.mail.Authenticator
import jakarta.mail.Message
import jakarta.mail.PasswordAuthentication
import jakarta.mail.Session
import jakarta.mail.Transport
import jakarta.mail.internet.InternetAddress
import jakarta.mail.internet.MimeMessage
import java.util.Properties

data class ImageSavedEvent(
    val imageId: String,
)

fun sendEmail(
    subject: String,
    body: String,
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
            setSubject(subject, "UTF-8")
            setText(body, "UTF-8")
        }

    Transport.send(message)
}

fun main() {
    val f =
        ConnectionFactory().apply {
            host = "rabbitmq"
            port = 5672
            username = System.getenv("RABBITMQ_ROOT_USERNAME")
            password = System.getenv("RABBITMQ_ROOT_PASSWORD")
        }
    val mapper =
        jacksonObjectMapper()
            .setPropertyNamingStrategy(PropertyNamingStrategies.SNAKE_CASE)

    f.newConnection().use { c ->
        c.createChannel().use { ch ->
            ch.basicConsume(
                "image.saved.notifier",
                true,
                { _, m ->
                    val json = String(m.body)
                    val event: ImageSavedEvent = mapper.readValue(json)
                    sendEmail("You got mail!", "Image ID: ${event.imageId}")
                },
                {},
            )
            Thread.currentThread().join()
        }
    }
}
