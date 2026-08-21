# Step 1
FROM dart:3.11.5 AS build

WORKDIR /app

COPY pubspec.* ./
RUN dart pub get

COPY . .
RUN dart compile exe bin/processor.dart -o processor

# Step 2
FROM debian:bookworm-slim

WORKDIR /app

COPY --from=build /app/processor .

EXPOSE 8080

CMD ["./processor"]
