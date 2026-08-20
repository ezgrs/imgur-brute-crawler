# Step 1
FROM gradle:9-jdk21 AS build

WORKDIR /app

COPY . .

RUN ./gradlew shadowJar --no-daemon

# Step 2
FROM eclipse-temurin:21-jre

WORKDIR /app

COPY --from=build /app/app/build/libs/*-all.jar app.jar

ENTRYPOINT ["java", "-jar", "app.jar"]
