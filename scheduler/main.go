package main

import (
	"context"
	"fmt"
	"log/slog"
	"math/rand"
	"os"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
)

func newLogger() *slog.Logger {
	return slog.New(
		slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
			Level: slog.LevelInfo,
			ReplaceAttr: func(groups []string, a slog.Attr) slog.Attr {
				if len(groups) == 0 {
					switch a.Key {
					case slog.TimeKey:
						a.Key = "timestamp"
					case slog.MessageKey:
						a.Key = "message"
					}
				}
				return a
			},
		}),
	).With(
		slog.String("service", "scheduler"),
	)
}

func generateRandomId(n int) string {
	const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
	b := make([]byte, n)
	for i := range b {
		b[i] = chars[rand.Intn(len(chars))]
	}
	return string(b)
}

type RunArgs struct {
	AmqpUsername string
	AmqpPassword string
}

func run(args RunArgs) (string, error) {
	conn, err := amqp.Dial(
		fmt.Sprintf("amqp://%s:%s@rabbitmq:5672/", args.AmqpUsername, args.AmqpPassword),
	)
	if err != nil {
		return "", fmt.Errorf("failed to connect to AMQP: %w", err)
	}
	defer conn.Close()

	ch, err := conn.Channel()
	if err != nil {
		return "", fmt.Errorf("failed to create an AMQP channel: %w", err)
	}
	defer ch.Close()

	randomId := generateRandomId(7)
	err = ch.PublishWithContext(
		context.Background(),
		"events",
		"image.requested",
		false, // mandatory
		false, // immediate
		amqp.Publishing{
			ContentType: "application/json",
			Timestamp:   time.Now(),
			Body:        fmt.Appendf(nil, `{"image_id": "%s"}`, randomId),
		},
	)
	if err != nil {
		return "", fmt.Errorf("failed to publish to the AMQP channel: %w", err)
	}
	return randomId, nil
}

func main() {
	logger := newLogger()
	if randomId, err := run(RunArgs{
		AmqpUsername: os.Getenv("RABBITMQ_ROOT_USERNAME"),
		AmqpPassword: os.Getenv("RABBITMQ_ROOT_PASSWORD"),
	}); err != nil {
		logger.Error(
			"failed to publish event",
			slog.Any("error", err),
		)
	} else {
		logger.Info(
			"published event",
			slog.String("image_id", randomId),
		)
	}
}
