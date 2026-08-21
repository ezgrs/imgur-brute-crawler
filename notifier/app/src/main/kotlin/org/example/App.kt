package org.example

import com.fasterxml.jackson.databind.PropertyNamingStrategies
import com.rabbitmq.client.ConnectionFactory
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue

data class ImageSavedEvent(
    val imageId: String
)

fun main() {
    val f = ConnectionFactory().apply {
        host = "rabbitmq"
        port = 5672
        username = System.getenv("RABBITMQ_ROOT_USERNAME")
        password = System.getenv("RABBITMQ_ROOT_PASSWORD")
    }
    val mapper = jacksonObjectMapper()
        .setPropertyNamingStrategy(PropertyNamingStrategies.SNAKE_CASE)

    f.newConnection().use { c ->
        c.createChannel().use { ch ->
            ch.basicConsume(
                "image.saved.notifier",
                true,
                { _, m ->
                    val json = String(m.body)
                    val event: ImageSavedEvent = mapper.readValue(json)
                    println(event.imageId)
                },
                {},
            )
            Thread.currentThread().join()
        }
    }
}
