import 'dart:io';

import 'package:dart_amqp/dart_amqp.dart' as amqp;
import 'package:minio/minio.dart' as minio;
import 'package:postgres/postgres.dart' as postgres;
import 'package:processor/models/image.dart';
import 'package:processor/models/metadata.dart';
import 'package:processor/services/database.dart';
import 'package:processor/services/imaging.dart';
import 'package:processor/services/listener.dart';
import 'package:processor/services/storage.dart';

Future<Database> createDatabase({
  required String username,
  required String password,
  required String database,
}) async {
  return PostgresDatabase(
    connection: await postgres.Connection.open(
      postgres.Endpoint(
        host: 'postgres',
        port: 5432,
        database: database,
        username: username,
        password: password,
      ),
    ),
  );
}

Future<Imaging> createImaging() async {
  return LocalImaging();
}

Future<Listener> createListener({
  required String username,
  required String password,
}) async {
  return RabbitMQListener(
    client: amqp.Client(
      settings: amqp.ConnectionSettings(
        host: 'http://rabbitmq:5672',
        authProvider: amqp.PlainAuthenticator(username, password),
      ),
    ),
  );
}

Future<Storage> createStorage({
  required String username,
  required String password,
}) async {
  return S3Storage(
    client: minio.Minio(
      endPoint: 'http://minio:9000',
      accessKey: username,
      secretKey: password,
      useSSL: true,
    ),
  );
}

Future<void> run({
  required Database database,
  required Imaging imaging,
  required Listener listener,
  required Storage storage,
}) async {
  await listener.listen((imageId) async {
    final Image image = await storage.download("images", imageId);
    final Metadata metadata = await imaging.parseMetadata(
      image.bytes,
      image.contentType,
    );
    await database.saveMetadata(imageId, metadata);
  });
}

Future<void> main() async {
  await run(
    database: await createDatabase(
      username: Platform.environment['POSTGRES_USERNAME']!,
      password: Platform.environment['POSTGRES_PASSWORD']!,
      database: Platform.environment['POSTGRES_DATABASE']!,
    ),
    imaging: await createImaging(),
    listener: await createListener(
      username: Platform.environment['RABBITMQ_ROOT_USERNAME']!,
      password: Platform.environment['RABBITMQ_ROOT_PASSWORD']!,
    ),
    storage: await createStorage(
      username: Platform.environment['MINIO_ROOT_USERNAME']!,
      password: Platform.environment['MINIO_ROOT_PASSWORD']!,
    ),
  );
}
