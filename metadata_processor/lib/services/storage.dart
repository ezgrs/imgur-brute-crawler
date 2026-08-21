import 'dart:typed_data';

import 'package:minio/minio.dart';
import 'package:minio/models.dart';

import '../models/image.dart';

abstract class Storage {
  Future<Image> download(String bucket, String id);
}

class S3Storage implements Storage {
  final Minio client;

  const S3Storage({required this.client});

  @override
  Future<Image> download(String bucket, String id) async {
    final StatObjectResult stat = await client.statObject(bucket, id);

    final MinioByteStream stream = await client.getObject(bucket, id);
    final List<int> chunks = [];
    await for (final chunk in stream) {
      chunks.addAll(chunk);
    }
    return Image(
      bytes: Uint8List.fromList(chunks),
      contentType: stat.metaData?["content-type"] ?? "application/octet-stream",
    );
  }
}
