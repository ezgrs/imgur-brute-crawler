import 'dart:typed_data';

import 'package:crypto/crypto.dart';
import 'package:image_size_getter/image_size_getter.dart';

import '../models/metadata.dart';

abstract class Imaging {
  Future<Metadata> parseMetadata(Uint8List bytes, String contentType);
}

class LocalImaging implements Imaging {
  const LocalImaging();

  @override
  Future<Metadata> parseMetadata(Uint8List bytes, String contentType) async {
    final SizeResult result = ImageSizeGetter.getSizeResult(
      MemoryInput.byteBuffer(bytes.buffer),
    );
    return Metadata(
      width: result.size.width,
      height: result.size.height,
      size: bytes.length,
      mimeType: contentType,
      hash: sha256.convert(bytes).toString(),
    );
  }
}
