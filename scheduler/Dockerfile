# Step 1
FROM golang:1.26-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -o scheduler .

# Step 2
FROM alpine:3.22

RUN apk add --no-cache dcron

WORKDIR /app

COPY --from=builder /app/scheduler .
RUN echo '* * * * * /app/scheduler > /proc/1/fd/1 2>&1' > /etc/crontabs/root

CMD ["crond", "-f", "-l", "2"]
