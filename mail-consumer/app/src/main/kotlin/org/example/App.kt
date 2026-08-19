package org.example

import com.rabbitmq.client.ConnectionFactory

fun main() {
    val f = ConnectionFactory().apply {
        host = "rabbitmq"
        port = 5672
        username = System.getenv("RABBITMQ_ROOT_USERNAME")
        password = System.getenv("RABBITMQ_ROOT_PASSWORD")
    }

    f.newConnection().use { c ->
        c.createChannel().use { ch ->
            ch.basicConsume(
                "image.saved",
                true,
                { _, m ->
                    println(String(m.body))
                },
                {},
            )
            readln()
        }
    }
}
