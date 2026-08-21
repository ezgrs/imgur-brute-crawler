class Metadata {
  final String id;
  final int width;
  final int height;
  final int size;
  final String mimeType;
  final String hash;
  final DateTime createdAt;

  const Metadata({
    required this.id,
    required this.width,
    required this.height,
    required this.size,
    required this.mimeType,
    required this.hash,
    required this.createdAt,
  });
}
