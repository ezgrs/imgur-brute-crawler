use lapin::{
    BasicProperties, Connection, ConnectionProperties, options::BasicPublishOptions, options::*,
    types::FieldTable,
};
use reqwest::{Client, StatusCode};
use serde::Deserialize;
use std::env;
use tokio_stream::StreamExt;

#[derive(Deserialize)]
struct ImageMessage {
    image_id: String,
}

fn parse_message(data: &[u8]) -> Result<ImageMessage, serde_json::Error> {
    serde_json::from_slice(data)
}

async fn fetch_image(image_id: &str) -> Result<Option<Vec<u8>>, reqwest::Error> {
    let client = Client::builder()
        .redirect(reqwest::redirect::Policy::none())
        .build()?;

    let url = format!("https://i.imgur.com/{image_id}.png");

    let response = client.get(url).send().await?;

    if response.status() == StatusCode::FOUND {
        return Ok(None);
    }

    let bytes = response.bytes().await?;

    Ok(Some(bytes.to_vec()))
}

async fn publish_image_saved(channel: &lapin::Channel, image_id: &str) -> Result<(), lapin::Error> {
    let payload = serde_json::json!({
        "image_id": image_id,
    });

    channel
        .basic_publish(
            "events",
            "image.saved",
            BasicPublishOptions::default(),
            payload.to_string().as_bytes(),
            BasicProperties::default().with_content_type("application/json".into()),
        )
        .await?
        .await?;

    Ok(())
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let username = env::var("RABBITMQ_ROOT_USERNAME")?;
    let password = env::var("RABBITMQ_ROOT_PASSWORD")?;

    let addr = format!("amqp://{}:{}@rabbitmq:5672/%2f", username, password);
    let connection = Connection::connect(&addr, ConnectionProperties::default()).await?;

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

        let message = parse_message(&delivery.data)?;
        match fetch_image(&message.image_id).await? {
            Some(_) => publish_image_saved(&channel, &message.image_id).await?,
            None => {}
        }

        delivery.ack(BasicAckOptions::default()).await?;
    }

    Ok(())
}
