# Backend

The HTTP API for Imgurdex.

It provides access to the images indexed by the system, backed by PostgreSQL. There is no grand architectural monologue here. It serves data, answers questions, and generally behaves like a backend.

## Prerequisites

### Java

The project requires **Java 21**.

[Download Java 21](https://adoptium.net/temurin/releases/?version=21)

Verify your installation:

```bash"
java --version
```

## Dependencies

Dependencies are managed with **Gradle**.

Use the included Gradle Wrapper for all Gradle commands rather than relying on whatever version happens to be installed on your machine. Reproducibility is good. Archaeology is for museums.

## Build

Build the application with:

```bash
./gradlew build
```

The generated JAR files are placed in:

```text
build/libs/
```

To build the Spring Boot executable JAR specifically:

```bash
./gradlew bootJar
```

The resulting artifact is generated at:

```text
build/libs/backend-0.0.1-SNAPSHOT.jar
```

Run the built application with:

```bash
java -jar build/libs/backend-0.0.1-SNAPSHOT.jar
```

## Development

The backend requires access to PostgreSQL.

### Environment

Set the following environment variables:

```text
POSTGRES_DATABASE
POSTGRES_USERNAME
POSTGRES_PASSWORD
```

The application connects to PostgreSQL at:

```text
postgres:5432
```

The database name, username, and password come from the environment variables above.

The application uses Hibernate's `validate` mode, so the database schema must already exist and match the application's entity mappings. This service will inspect the furniture; it will not build the house.

### Run locally

Start the application with:

```bash
./gradlew bootRun
```

By default, the HTTP server listens on:

```text
http://localhost:8080
```

The available image endpoints are:

```text
GET /images
GET /images/{id}
GET /images/random
```

`GET /images` supports Spring's pagination parameters, for example:

```text
GET /images?page=0&size=20
```

The API also exposes its OpenAPI documentation through the application's OpenAPI integration.

## Formatting

Format the Java source with:

```bash
./gradlew spotlessApply
```

Check formatting without modifying files:

```bash
./gradlew spotlessCheck
```

Formatting is handled by Spotless using Palantir Java Format. In other words, the arguments about where the braces go have been outsourced to a machine. A blessed arrangement.
