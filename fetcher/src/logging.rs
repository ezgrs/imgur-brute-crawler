#[derive(Clone)]
pub struct Logger {
    fields: serde_json::Map<String, serde_json::Value>,
}

impl Logger {
    pub fn new(service: impl Into<String>) -> Self {
        let mut fields = serde_json::Map::new();
        fields.insert("service".into(), service.into().into());

        Self { fields }
    }

    pub fn with(&self, key: impl Into<String>, value: impl Into<serde_json::Value>) -> Self {
        let mut fields = self.fields.clone();
        fields.insert(key.into(), value.into());

        Self { fields }
    }

    pub fn info(&self, message: impl Into<String>) {
        self.log("INFO", message.into(), None);
    }

    pub fn error(&self, message: impl Into<String>, error: &anyhow::Error) {
        self.log("ERROR", message.into(), Some(error));
    }

    fn log(&self, level: &str, message: String, error: Option<&anyhow::Error>) {
        let mut output = self.fields.clone();

        output.insert("level".into(), level.into());
        output.insert("message".into(), message.into());

        if let Some(error) = error {
            output.insert("error".into(), error.to_string().into());
        }

        output.insert(
            "timestamp".into(),
            chrono::Utc::now()
                .to_rfc3339_opts(chrono::SecondsFormat::Secs, true)
                .into(),
        );

        println!("{}", serde_json::Value::Object(output));
    }
}
