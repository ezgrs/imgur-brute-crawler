import 'dart:io';

import 'package:dart_amqp/dart_amqp.dart' as amqp;
import 'package:dbmigrator_psql/dbmigrator_psql.dart';
import 'package:minio/minio.dart' as minio;
import 'package:postgres/postgres.dart' as postgres;
import 'package:processor/models/image.dart';
import 'package:processor/models/metadata.dart';
import 'package:processor/services/database.dart';
import 'package:processor/services/imaging.dart';
import 'package:processor/services/listener.dart';
import 'package:processor/services/logger.dart';
import 'package:processor/services/storage.dart';

Future<Database> createDatabase({
  required String username,
  required String password,
  required String database,
}) async {
  final postgres.Connection connection = await postgres.Connection.open(
    postgres.Endpoint(
      host: 'postgres',
      port: 5432,
      database: database,
      username: username,
      password: password,
    ),
    settings: postgres.ConnectionSettings(sslMode: postgres.SslMode.disable),
  );

  // Apply migrations
  final migrationResult = await connection
      .migrator(options: PsqlMigrationOptions(path: './migrations'))
      .migrate(version: '0.1.0');
  print(migrationResult.message);

  return PostgresDatabase(connection: connection);
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
        host: 'rabbitmq',
        port: 5672,
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
      endPoint: 'minio',
      port: 9000,
      accessKey: username,
      secretKey: password,
      useSSL: false,
    ),
  );
}

Future<void> handle({
  required Database database,
  required Imaging imaging,
  required Storage storage,
  required Logger logger,
  required String imageId,
}) async {
  final Image image;
  try {
    image = await storage.download("images", imageId);
  } catch (e, s) {
    logger.error("failed to download image from S3", error: e, stackTrace: s);
    return;
  }
  logger.info("downloaded image from S3");

  final Metadata metadata;
  try {
    metadata = await imaging.parseMetadata(image.bytes, image.contentType);
  } catch (e, s) {
    logger.error(
      "failed to parse metadata from image",
      error: e,
      stackTrace: s,
    );
    return;
  }
  logger.info("parsed metadata from image");

  try {
    await database.saveMetadata(imageId, metadata);
  } catch (e, s) {
    logger.error(
      "failed to save metadata to database",
      error: e,
      stackTrace: s,
    );
    return;
  }
  logger.info("saved metadata to database");
}

Future<void> run({
  required Database database,
  required Imaging imaging,
  required Listener listener,
  required Storage storage,
  required Logger logger,
}) async {
  await listener.listen((imageId) async {
    await handle(
      database: database,
      imaging: imaging,
      storage: storage,
      logger: logger.child({"image_id": imageId}),
      imageId: imageId,
    );
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
    logger: Logger({"service": "metadata-processor"}),
  );
}
