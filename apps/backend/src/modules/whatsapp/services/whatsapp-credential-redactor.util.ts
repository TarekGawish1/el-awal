export const REDACTED_PASSWORD_PLACEHOLDER = '••••••••';

/**
 * Removes `pass=` or `password=` query parameters from any URL within a string.
 * Leaves all other query parameters and URL structure intact.
 */
export function removePassFromUrl(rawUrl: string): string {
  if (!rawUrl) return rawUrl;
  return rawUrl
    .replace(/([?&])(?:pass|password)=[^&\s\r\n]+/gi, '$1')
    .replace(/\?&+/g, '?')
    .replace(/&&+/g, '&')
    .replace(/[?&]+$/, '');
}

/**
 * Redacts secret credentials (student/parent passwords and URL pass parameters)
 * from stored WhatsApp message bodies and notification messages.
 *
 * Preserves all non-sensitive text, structure, names, codes, phone numbers,
 * greetings, and platform links.
 */
export function redactCredentialMessageBody(body: string): string {
  if (!body) return body;

  let sanitized = body;

  // 1. Remove pass= query parameter from any URLs in the text
  sanitized = sanitized.replace(/https?:\/\/[^\s\r\n]+/g, (match) => {
    return removePassFromUrl(match);
  });

  // 2. Redact Arabic credential patterns with backticks
  sanitized = sanitized.replace(
    /(- كلمة (?:المرور|مرور ولي الأمر|مرور الطالب):\s*)`(?!\s*•)[^`\r\n]+`/g,
    `$1\`${REDACTED_PASSWORD_PLACEHOLDER}\``,
  );

  // 3. Redact Arabic credential patterns with bullet list items
  sanitized = sanitized.replace(
    /(▫️\s*\*كلمة (?:المرور(?: الجديدة)?|مرور ولي الأمر|مرور الطالب):\*\s+)(?!•|\[)[^\r\n]+/g,
    `$1${REDACTED_PASSWORD_PLACEHOLDER}`,
  );

  // 4. Any remaining standard '- كلمة المرور: <plaintext>' (without backticks)
  sanitized = sanitized.replace(
    /(- كلمة (?:المرور|مرور ولي الأمر|مرور الطالب):\s+)(?!`|•|\[)[^\r\n]+/g,
    `$1${REDACTED_PASSWORD_PLACEHOLDER}`,
  );

  return sanitized;
}

/**
 * Checks whether the message body still contains unredacted credentials or pass= query params.
 */
export function hasUnredactedCredentials(body: string): boolean {
  if (!body) return false;

  // Check for pass= query parameter in URLs
  if (/[?&](?:pass|password)=[^&\s\r\n]+/i.test(body)) {
    return true;
  }

  // Check for unredacted backticked passwords
  const backtickMatches = body.match(/- كلمة (?:المرور|مرور ولي الأمر|مرور الطالب):\s*`([^`\r\n]+)`/g);
  if (backtickMatches) {
    for (const m of backtickMatches) {
      if (!m.includes(REDACTED_PASSWORD_PLACEHOLDER)) return true;
    }
  }

  // Check for unredacted list items
  const listItemMatches = body.match(/▫️\s*\*كلمة (?:المرور(?: الجديدة)?|مرور ولي الأمر|مرور الطالب):\*\s*([^\r\n]+)/g);
  if (listItemMatches) {
    for (const m of listItemMatches) {
      if (!m.includes(REDACTED_PASSWORD_PLACEHOLDER)) return true;
    }
  }

  // Check for unredacted plain lines
  const plainMatches = body.match(/- كلمة (?:المرور|مرور ولي الأمر|مرور الطالب):\s*([^\r\n]+)/g);
  if (plainMatches) {
    for (const m of plainMatches) {
      if (!m.includes(REDACTED_PASSWORD_PLACEHOLDER)) return true;
    }
  }

  return false;
}

/**
 * Checks whether the message body has been safely redacted.
 */
export function isMessageBodyRedacted(body: string): boolean {
  if (!body) return false;
  return body.includes(REDACTED_PASSWORD_PLACEHOLDER) && !hasUnredactedCredentials(body);
}

/**
 * Redacts secret properties from Notification.data JSON payloads.
 */
export function redactNotificationData(
  data: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (!data || typeof data !== 'object') return null;

  const copy = { ...data };

  if ('studentPassword' in copy) {
    delete copy.studentPassword;
  }
  if ('parentPassword' in copy) {
    delete copy.parentPassword;
  }
  if (typeof copy.directLoginUrl === 'string' && /[?&](?:pass|password)=/i.test(copy.directLoginUrl)) {
    copy.directLoginUrl = removePassFromUrl(copy.directLoginUrl);
  }

  return copy;
}
