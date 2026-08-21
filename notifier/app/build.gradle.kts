plugins {
    alias(libs.plugins.kotlin.jvm)
    application
    id("com.gradleup.shadow") version "9.2.2"
    id("org.jlleitschuh.gradle.ktlint") version "14.2.0"
}

repositories {
    mavenCentral()
}

dependencies {
    implementation("com.rabbitmq:amqp-client:5.27.0")
    implementation("com.fasterxml.jackson.module:jackson-module-kotlin:2.20.0")
}

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}

application {
    mainClass = "org.example.AppKt"
}
