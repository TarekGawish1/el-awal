export type QrErrorCode = 'INVALID_QR_CODE' | 'EMPTY_PAYLOAD' | 'STUDENT_NOT_FOUND';

export interface ParsedQrPayload {
  isValid: boolean;
  raw: string;
  type?: 'STUDENT_QR';
  studentId?: string;
  studentCode?: string;
  token?: string;
  error?: QrErrorCode;
  errorMessage?: string;
}

export const QR_ERROR_MESSAGES = {
  INVALID_QR_CODE: 'الرمز الممسوح ضوئياً لا يتبع منصة الأول وغير مسجل في النظام.',
  EMPTY_PAYLOAD: 'رمز الاستجابة السريعة فارغ.',
  STUDENT_NOT_FOUND: 'بيانات الطالب غير مسجلة في قاعدة البيانات المحلية. يرجى تحديث البيانات عند توفر الإنترنت.',
} as const;

/**
 * Validates and parses a raw scanned QR code value according to the platform schema:
 * 1. JSON schema: { "type": "STUDENT_QR", "studentId": "...", "code": "STU-2026-XXXX", "token": "..." }
 * 2. Signed payload string: "ELAWAL:STU:<studentId>:<token>" or "ELAWAL:STUDENT:<studentId>:<token>"
 * 3. Platform token prefixes: "qr_tok_...", "QR-STU-...", "QR-OFFLINE-...", "QR-...", "qr-...", "STU-..."
 * 
 * Rejects arbitrary barcodes, non-system URLs (e.g., https://google.com), random device serials (e.g., LENOVO-SN-12345),
 * and random text.
 */
export function parseStudentQr(rawInput: unknown): ParsedQrPayload {
  if (rawInput === null || rawInput === undefined || typeof rawInput !== 'string') {
    return {
      isValid: false,
      raw: '',
      error: 'EMPTY_PAYLOAD',
      errorMessage: QR_ERROR_MESSAGES.EMPTY_PAYLOAD,
    };
  }

  const raw = rawInput.trim();
  if (!raw) {
    return {
      isValid: false,
      raw: '',
      error: 'EMPTY_PAYLOAD',
      errorMessage: QR_ERROR_MESSAGES.EMPTY_PAYLOAD,
    };
  }

  // 1. Reject generic external URLs and protocols
  if (/^(https?:\/\/|ftp:\/\/|mailto:|tel:|www\.)/i.test(raw)) {
    return {
      isValid: false,
      raw,
      error: 'INVALID_QR_CODE',
      errorMessage: QR_ERROR_MESSAGES.INVALID_QR_CODE,
    };
  }

  // 2. Check JSON payload format
  if (raw.startsWith('{') && raw.endsWith('}')) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        if (parsed.type === 'STUDENT_QR') {
          const studentId = parsed.studentId ? String(parsed.studentId).trim() : (parsed.id ? String(parsed.id).trim() : undefined);
          const studentCode = parsed.code ? String(parsed.code).trim() : (parsed.studentCode ? String(parsed.studentCode).trim() : undefined);
          const token = parsed.token
            ? String(parsed.token).trim()
            : parsed.qrCodeToken
            ? String(parsed.qrCodeToken).trim()
            : (studentId || studentCode);

          if (studentId || studentCode || token) {
            return {
              isValid: true,
              raw,
              type: 'STUDENT_QR',
              studentId,
              studentCode,
              token: token || studentId || studentCode,
            };
          }
        }
      }
    } catch {
      // Invalid JSON syntax falls through
    }

    // JSON object that does not conform to STUDENT_QR
    return {
      isValid: false,
      raw,
      error: 'INVALID_QR_CODE',
      errorMessage: QR_ERROR_MESSAGES.INVALID_QR_CODE,
    };
  }

  // 3. Check Signed Payload String format: ELAWAL:STU:<studentId>:<token> or ELAWAL:STUDENT:<studentId>:<token>
  if (/^ELAWAL:(STU|STUDENT):/i.test(raw)) {
    const parts = raw.split(':');
    if (parts.length >= 3) {
      const studentId = parts[2]?.trim();
      const token = parts[3]?.trim() || studentId;
      if (studentId) {
        return {
          isValid: true,
          raw,
          type: 'STUDENT_QR',
          studentId,
          token,
        };
      }
    }

    return {
      isValid: false,
      raw,
      error: 'INVALID_QR_CODE',
      errorMessage: QR_ERROR_MESSAGES.INVALID_QR_CODE,
    };
  }

  // 4. Check standard platform token and studentCode prefixes
  // Backend generated UUID tokens: 'qr_tok_...'
  // Offline & platform tokens: 'QR-STU-...', 'QR-OFFLINE-...', 'QR-...', 'qr-...'
  // Student codes: 'STU-...'
  if (
    raw.startsWith('qr_tok_') ||
    /^QR[-_]/i.test(raw) ||
    /^qr[-_]/i.test(raw) ||
    /^STU[-_]/i.test(raw)
  ) {
    return {
      isValid: true,
      raw,
      type: 'STUDENT_QR',
      token: raw,
      studentCode: /^STU[-_]/i.test(raw) ? raw : undefined,
    };
  }

  // Any other random barcode / arbitrary string (e.g. "LENOVO-SN-12345", "123456789")
  return {
    isValid: false,
    raw,
    error: 'INVALID_QR_CODE',
    errorMessage: QR_ERROR_MESSAGES.INVALID_QR_CODE,
  };
}
