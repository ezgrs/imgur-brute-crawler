import 'dart:typed_data';

class Image {
  final Uint8List bytes;
  final String contentType;

  const Image({required this.bytes, required this.contentType});
}
