export interface ParsedEssayAnswer {
  text: string;
  imageUrl?: string;
}

/**
 * Parses a student's essay answer which may contain plain text, a JSON payload with
 * text and/or an image URL, or a direct image URL.
 */
export function parseEssayAnswer(rawAnswer?: string | null): ParsedEssayAnswer {
  if (!rawAnswer) return { text: '' };

  const trimmed = rawAnswer.trim();

  // Try parsing JSON if present: { text?: string, imageUrl?: string }
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed === 'object' && parsed !== null) {
        return {
          text: typeof parsed.text === 'string' ? parsed.text : '',
          imageUrl: typeof parsed.imageUrl === 'string' && parsed.imageUrl ? parsed.imageUrl : undefined,
        };
      }
    } catch {}
  }

  // Check if raw string is directly an image URL
  const isDirectImage = /^https?:\/\/.+\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i.test(trimmed);
  if (isDirectImage) {
    return { text: '', imageUrl: trimmed };
  }

  return { text: rawAnswer };
}

/**
 * Serializes text and image URL into a unified answer string.
 */
export function formatEssayAnswer(text?: string, imageUrl?: string): string {
  const cleanText = (text || '').trim();
  const cleanImg = (imageUrl || '').trim();

  if (cleanImg && cleanText) {
    return JSON.stringify({ text: cleanText, imageUrl: cleanImg });
  }
  if (cleanImg) {
    return JSON.stringify({ text: '', imageUrl: cleanImg });
  }
  return cleanText;
}
