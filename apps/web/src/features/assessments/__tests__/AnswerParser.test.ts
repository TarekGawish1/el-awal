import { describe, expect, it } from 'vitest';
import { parseEssayAnswer, formatEssayAnswer } from '../utils/answer-parser';

describe('answer-parser', () => {
  it('formats and parses text-only essay answer', () => {
    const formatted = formatEssayAnswer('إجابتي المقالية المفصلة');
    expect(formatted).toBe('إجابتي المقالية المفصلة');

    const parsed = parseEssayAnswer(formatted);
    expect(parsed.text).toBe('إجابتي المقالية المفصلة');
    expect(parsed.imageUrl).toBeUndefined();
  });

  it('formats and parses image-only essay answer', () => {
    const formatted = formatEssayAnswer('', 'https://cdn.example.com/homework/sol1.png');
    expect(formatted).toBe(JSON.stringify({ text: '', imageUrl: 'https://cdn.example.com/homework/sol1.png' }));

    const parsed = parseEssayAnswer(formatted);
    expect(parsed.text).toBe('');
    expect(parsed.imageUrl).toBe('https://cdn.example.com/homework/sol1.png');
  });

  it('formats and parses both text and image essay answer', () => {
    const formatted = formatEssayAnswer('شرح الخطوات في الصورة المرفقة', 'https://cdn.example.com/homework/sol2.jpg');
    expect(formatted).toBe(JSON.stringify({ text: 'شرح الخطوات في الصورة المرفقة', imageUrl: 'https://cdn.example.com/homework/sol2.jpg' }));

    const parsed = parseEssayAnswer(formatted);
    expect(parsed.text).toBe('شرح الخطوات في الصورة المرفقة');
    expect(parsed.imageUrl).toBe('https://cdn.example.com/homework/sol2.jpg');
  });

  it('handles direct image URL legacy answers', () => {
    const parsed = parseEssayAnswer('https://cdn.example.com/uploads/photo.jpeg');
    expect(parsed.text).toBe('');
    expect(parsed.imageUrl).toBe('https://cdn.example.com/uploads/photo.jpeg');
  });

  it('handles null, undefined and empty answers gracefully', () => {
    expect(parseEssayAnswer(null)).toEqual({ text: '' });
    expect(parseEssayAnswer(undefined)).toEqual({ text: '' });
    expect(parseEssayAnswer('')).toEqual({ text: '' });
  });

  it('handles non-JSON raw strings gracefully', () => {
    const raw = 'إجابة عادية بدون أي تنسيق خاص';
    expect(parseEssayAnswer(raw)).toEqual({ text: raw });
  });
});
