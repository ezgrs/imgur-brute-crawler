import 'dart:convert';

import 'package:dart_amqp/dart_amqp.dart';

abstract class Listener {
  Future<void> listen(Future<void> Function(String imageId) callback);
}

class RabbitMQListener implements Listener {
  final Client client;

  const RabbitMQListener({required this.client});

  @override
  Future<void> listen(Future<void> Function(String imageId) callback) async {
    final Channel channel = await client.channel();
    final Queue queue = await channel.queue(
      "image.saved.metadata-processor",
      durable: true,
      declare: false,
    );

    await channel.qos(0, 1);

    final Consumer consumer = await queue.consume(noAck: false);
    consumer.listen((message) async {
      final String body = message.payloadAsString;
      final Object? data;
      try {
        data = json.decode(body);
      } on FormatException {
        print("invalid JSON data: $body");
        return message.reject(true);
      }
      switch (data) {
        case {"image_id": String imageId}:
          await callback(imageId);
        default:
          print("invalid message: $data");
          return message.reject(true);
      }
      message.ack();
    });
  }
}
