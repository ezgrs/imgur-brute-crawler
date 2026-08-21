use tokio_stream::StreamExt;

#[derive(serde::Deserialize)]
struct ImageMessage {
    image_id: String,
}

async fn create_s3_client(username: &str, password: &str) -> aws_sdk_s3::Client {
    let credentials = aws_sdk_s3::config::Credentials::new(username, password, None, None, "minio");

    let sdk_config = aws_config::defaults(aws_config::BehaviorVersion::latest())
        .region(aws_sdk_s3::config::Region::new("us-east-1"))
        .credentials_provider(credentials)
        .load()
        .await;

    let s3_config = aws_sdk_s3::config::Builder::from(&sdk_config)
        .endpoint_url("http://minio:9000")
        .force_path_style(true)
        .build();

    aws_sdk_s3::Client::from_conf(s3_config)
}

fn parse_message(data: &[u8]) -> Result<ImageMessage, serde_json::Error> {
    serde_json::from_slice(data)
}

async fn fetch_image(image_id: &str) -> Result<Option<Vec<u8>>, reqwest::Error> {
    let client = reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::none())
        .build()?;

    let url = format!("https://i.imgur.com/{image_id}.png");

    let response = client.get(url).send().await?;

    if response.status() == reqwest::StatusCode::FOUND {
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
            "events".into(),
            "image.saved".into(),
            lapin::options::BasicPublishOptions::default(),
            payload.to_string().as_bytes(),
            lapin::BasicProperties::default().with_content_type("application/json".into()),
        )
        .await?
        .await?;

    Ok(())
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let username = std::env::var("RABBITMQ_ROOT_USERNAME")?;
    let password = std::env::var("RABBITMQ_ROOT_PASSWORD")?;

    let addr = format!("amqp://{}:{}@rabbitmq:5672/%2f", username, password);
    let connection =
        lapin::Connection::connect(&addr, lapin::ConnectionProperties::default()).await?;

    let channel = connection.create_channel().await?;

    let _s3 = create_s3_client(
        &std::env::var("MINIO_ROOT_USERNAME")?,
        &std::env::var("MINIO_ROOT_PASSWORD")?,
    )
    .await;

    let mut consumer = channel
        .basic_consume(
            "image.requested".into(),
            "fetcher".into(),
            lapin::options::BasicConsumeOptions::default(),
            lapin::types::FieldTable::default(),
        )
        .await?;

    while let Some(delivery) = consumer.next().await {
        let delivery = delivery?;

        let message = parse_message(&delivery.data)?;
        match fetch_image(&message.image_id).await? {
            Some(_) => publish_image_saved(&channel, &message.image_id).await?,
            None => {}
        }

        delivery
            .ack(lapin::options::BasicAckOptions::default())
            .await?;
    }

    Ok(())
}
