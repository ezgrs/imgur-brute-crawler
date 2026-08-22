use anyhow::Context;
use tokio_stream::StreamExt;
mod logging;

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

async fn ensure_s3_bucket(s3: &aws_sdk_s3::Client, bucket: &str) -> anyhow::Result<()> {
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

    let response = client
        .get(format!("https://i.imgur.com/{image_id}.png"))
        .header("accept", "image/avif,image/webp,image/apng,*/*")
        .header("accept-encoding", "gzip, deflate, br, zstd")
        .header("accept-language", "pt-BR,pt;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6")
        .header("cache-control", "no-cache")
        .header("pragma", "no-cache")
        .header("priority", "u=0, i")
        .header("referer", "https://i.imgur.com/")
        .header("upgrade-insecure-requests", "1")
        .header("user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0")
        .header("sec-ch-ua", "\"Microsoft Edge\";v=\"147\", \"Not.A/Brand\";v=\"8\", \"Chromium\";v=\"147\"")
        .header("sec-ch-ua-mobile", "?0")
        .header("sec-ch-ua-platform", "\"Windows\"")
        .header("sec-fetch-dest", "document")
        .header("sec-fetch-mode", "navigate")
        .header("sec-fetch-site", "same-site")
        .header("sec-fetch-user", "?1")
        .send()
        .await?;

    if response.status() == reqwest::StatusCode::FOUND {
        let location = response
            .headers()
            .get(reqwest::header::LOCATION)
            .and_then(|value| value.to_str().ok());

        assert_eq!(location, Some("https://i.imgur.com/removed.png"));
        return Ok(None);
    }

    let bytes = response.bytes().await?;

    Ok(Some(bytes.to_vec()))
}

fn detect_content_type(bytes: &[u8]) -> &'static str {
    if bytes.len() < 4 {
        return "application/octet-stream";
    }
    match [bytes[0], bytes[1], bytes[2], bytes[3]] {
        [0xff, 0xd8, 0xff, _] => "image/jpeg",
        [0x47, 0x49, 0x46, 0x38] => "image/gif",
        [0x89, 0x50, 0x4e, 0x47] => "image/png",
        _ => "application/octet-stream",
    }
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

async fn handle(
    logger: &logging::Logger,
    rabbitmq: &lapin::Channel,
    s3: &aws_sdk_s3::Client,
    image_id: &str,
) -> anyhow::Result<()> {
    logger.info("event received");

    match fetch_image(&image_id)
        .await
        .context("failed to fetch image")?
    {
        Some(bytes) => {
            logger.info("hit");

            s3.put_object()
                .bucket("images")
                .key(image_id)
                .content_type(detect_content_type(&bytes))
                .body(bytes.into())
                .send()
                .await
                .context("failed to save image into S3")?;
            logger.info("saved image into S3");

            publish_image_saved(&rabbitmq, &image_id)
                .await
                .context("failed to publish event")?;
        }
        None => {
            logger.info("miss");
        }
    };

    Ok(())
}

async fn run(logger: &logging::Logger) -> anyhow::Result<()> {
    let rabbitmq = create_rabbitmq_channel(
        &std::env::var("RABBITMQ_ROOT_USERNAME")?,
        &std::env::var("RABBITMQ_ROOT_PASSWORD")?,
    )
    .await
    .context("failed to connect to RabbitMQ")?;

    let s3 = create_s3_client(
        &std::env::var("MINIO_ROOT_USERNAME")?,
        &std::env::var("MINIO_ROOT_PASSWORD")?,
    )
    .await;

    ensure_s3_bucket(&s3, "images")
        .await
        .context("failed to create images bucket on S3")?;

    let mut consumer = rabbitmq
        .basic_consume(
            "image.requested".into(),
            "fetcher".into(),
            lapin::options::BasicConsumeOptions::default(),
            lapin::types::FieldTable::default(),
        )
        .await
        .context("failed to connect to RabbitMQ queue")?;

    while let Some(delivery) = consumer.next().await {
        let delivery = delivery?;

        let message = parse_message(&delivery.data)?;
        let image_id = message.image_id;

        let event_logger = logger.with("image_id", image_id.clone());
        handle(&event_logger, &rabbitmq, &s3, &image_id)
            .await
            .with_context(|| format!("failed to handle event {}", image_id))?;

        delivery
            .ack(lapin::options::BasicAckOptions::default())
            .await?;
    }

    Ok(())
}

#[tokio::main]
async fn main() {
    let logger = logging::Logger::new("fetcher");

    if let Err(err) = run(&logger).await {
        logger.error("failed to consume event", &err);
        std::process::exit(1);
    }
}
