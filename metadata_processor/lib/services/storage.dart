import 'dart:typed_data';

import 'package:minio/minio.dart';

abstract class Storage {
  Future<Uint8List> download(String bucket, String id);
}

class S3Storage implements Storage {
  final Minio client;

  const S3Storage({required this.client});

  @override
  Future<Uint8List> download(String bucket, String id) async {
    final MinioByteStream stream = await client.getObject(bucket, id);
    final List<int> chunks = [];
    await for (final chunk in stream) {
      chunks.addAll(chunk);
    }
    return Uint8List.fromList(chunks);
  }
}
