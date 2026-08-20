package main

import (
	"context"
	"fmt"
	"log"
	"math/rand"
	"os"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
)

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

func run(args RunArgs) error {
	conn, err := amqp.Dial(
		fmt.Sprintf("amqp://%s:%s@rabbitmq:5672/", args.AmqpUsername, args.AmqpPassword),
	)
	if err != nil {
		return fmt.Errorf("failed to connect to AMQP: %w", err)
	}
	defer conn.Close()

	ch, err := conn.Channel()
	if err != nil {
		return fmt.Errorf("failed to create an AMQP channel: %w", err)
	}
	defer ch.Close()

	err = ch.PublishWithContext(
		context.Background(),
		"events",
		"image.requested",
		false, // mandatory
		false, // immediate
		amqp.Publishing{
			ContentType: "application/json",
			Timestamp:   time.Now(),
			Body:        fmt.Appendf(nil, `{"image_id": "%s"}`, generateRandomId(7)),
		},
	)
	if err != nil {
		return fmt.Errorf("failed to publish to the AMQP channel: %w", err)
	}
	return nil
}

func main() {
	if err := run(RunArgs{
		AmqpUsername: os.Getenv("RABBITMQ_ROOT_USERNAME"),
		AmqpPassword: os.Getenv("RABBITMQ_ROOT_PASSWORD"),
	}); err != nil {
		log.Fatal(err)
	}
	log.Println("Event published successfully")
}
