use lapin::{Connection, ConnectionProperties, options::*, types::FieldTable};
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
            Some(image) => println!("Recebi {} bytes", image.len()),
            None => println!("Imagem não encontrada"),
        }

        delivery.ack(BasicAckOptions::default()).await?;
    }

    Ok(())
}
