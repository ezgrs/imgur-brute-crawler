use std::env;
use tokio_stream::StreamExt;
use lapin::{
    options::*,
    types::FieldTable,
    Connection,
    ConnectionProperties,
};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let username = env::var("RABBITMQ_ROOT_USERNAME")?;
    let password = env::var("RABBITMQ_ROOT_PASSWORD")?;

    let addr = format!(
        "amqp://{}:{}@rabbitmq:5672/%2f",
        username, password
    );
    let connection = Connection::connect(
        &addr,
        ConnectionProperties::default(),
    )
    .await?;

    let channel = connection.create_channel().await?;

    let mut consumer = channel
        .basic_consume(
            "image.requested".into(),
            "fetcher".into(),
            BasicConsumeOptions::default(),
            FieldTable::default(),
        )
        .await?;

    while let Some(delivery) = consumer.next().await {
        let delivery = delivery?;

        println!("Fetcher: {}", String::from_utf8_lossy(&delivery.data));

        delivery.ack(BasicAckOptions::default()).await?;
    }

    Ok(())
}