import 'dart:convert';

class Logger {
  final Map<String, Object?> fields;

  const Logger([this.fields = const {}]);

  Logger child(Map<String, Object?> childFields) {
    return Logger({...fields, ...childFields});
  }

  void info(String message, {Map<String, Object?> fields = const {}}) {
    _log('INFO', message, fields);
  }

  void warn(String message, {Map<String, Object?> fields = const {}}) {
    _log('WARN', message, fields);
  }

  void error(
    String message, {
    Object? error,
    StackTrace? stackTrace,
    Map<String, Object?> fields = const {},
  }) {
    _log('error', message, {
      ...fields,
      if (error != null) 'error': error.toString(),
      if (stackTrace != null) 'stacktrace': stackTrace.toString(),
    });
  }

  void _log(String level, String message, Map<String, Object?> eventFields) {
    final entry = {
      ...fields,
      ...eventFields,
      'level': level,
      'message': message,
      'timestamp': DateTime.now().toUtc().toIso8601String(),
    };

    print(jsonEncode(entry));
  }
}
