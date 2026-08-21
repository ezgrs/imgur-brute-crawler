use tokio_stream::StreamExt;

#[derive(serde::Deserialize)]
struct ImageMessage {
    image_id: String,
}

async fn create_rabbitmq_channel(
    username: &str,
    password: &str,
) -> Result<lapin::Channel, lapin::Error> {
    let addr = format!("amqp://{}:{}@rabbitmq:5672/%2f", username, password);
    let connection =
        lapin::Connection::connect(&addr, lapin::ConnectionProperties::default()).await?;

    let channel = connection.create_channel().await?;

    Ok(channel)
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

async fn ensure_s3_bucket(
    s3: &aws_sdk_s3::Client,
    bucket: &str,
) -> Result<(), Box<dyn std::error::Error>> {
    if s3.head_bucket().bucket(bucket).send().await.is_ok() {
        return Ok(());
    }

    s3.create_bucket().bucket(bucket).send().await?;

    Ok(())
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

async fn publish_image_saved(
    rabbitmq: &lapin::Channel,
    image_id: &str,
) -> Result<(), lapin::Error> {
    let payload = serde_json::json!({
        "image_id": image_id,
    });

    rabbitmq
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
    let rabbitmq = create_rabbitmq_channel(
        &std::env::var("RABBITMQ_ROOT_USERNAME")?,
        &std::env::var("RABBITMQ_ROOT_PASSWORD")?,
    )
    .await?;

    let s3 = create_s3_client(
        &std::env::var("MINIO_ROOT_USERNAME")?,
        &std::env::var("MINIO_ROOT_PASSWORD")?,
    )
    .await;

    ensure_s3_bucket(&s3, "images").await?;

    let mut consumer = rabbitmq
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
        let image_id = message.image_id;
        match fetch_image(&image_id).await? {
            Some(bytes) => {
                s3.put_object()
                    .bucket("images")
                    .key(&image_id)
                    .body(bytes.into())
                    .send()
                    .await?;

                publish_image_saved(&rabbitmq, &image_id).await?;
            }
            None => {}
        }

        delivery
            .ack(lapin::options::BasicAckOptions::default())
            .await?;
    }

    Ok(())
}
