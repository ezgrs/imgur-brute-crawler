import 'package:postgres/postgres.dart';

import '../models/metadata.dart';

abstract class Database {
  Future<void> saveMetadata(Metadata metadata);
}

class PostgresDatabase implements Database {
  final Connection connection;

  const PostgresDatabase({required this.connection});

  @override
  Future<void> saveMetadata(Metadata metadata) async {
    await connection.execute(
      Sql.named('''
        INSERT INTO images (
          id,
          width,
          height,
          size,
          mime_type,
          hash,
          created_at
        )
        VALUES (
          @id,
          @width,
          @height,
          @size,
          @mimeType,
          @hash,
          @createdAt
        )
      '''),
      parameters: {
        'id': metadata.id,
        'width': metadata.width,
        'height': metadata.height,
        'size': metadata.size,
        'mimeType': metadata.mimeType,
        'hash': metadata.hash,
        'createdAt': metadata.createdAt,
      },
    );
  }
}
