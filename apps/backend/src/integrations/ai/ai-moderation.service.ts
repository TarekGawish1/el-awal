import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { assertCleanContent, containsProfanity } from '../../common/utils/content-moderation.util';

export interface AiModerationResult {
  isValid: boolean;
  reason?: string | null;
  flaggedBy: 'RULE_FILTER' | 'AI_SEMANTIC' | 'CLEAN';
}

@Injectable()
export class AiModerationService {
  private readonly logger = new Logger(AiModerationService.name);
  private readonly geminiApiKey?: string;
  private readonly openaiApiKey?: string;
  private readonly isAiEnabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.geminiApiKey =
      this.configService.get<string>('GEMINI_API_KEY') ||
      this.configService.get<string>('AI_MODERATION_API_KEY') ||
      process.env.GEMINI_API_KEY ||
      process.env.AI_MODERATION_API_KEY;

    this.openaiApiKey =
      this.configService.get<string>('OPENAI_API_KEY') ||
      process.env.OPENAI_API_KEY;

    const envEnabled =
      this.configService.get<string>('AI_MODERATION_ENABLED') ||
      process.env.AI_MODERATION_ENABLED;

    this.isAiEnabled = envEnabled !== 'false' && Boolean(this.geminiApiKey || this.openaiApiKey);

    if (this.isAiEnabled) {
      const provider = this.geminiApiKey ? 'Google Gemini' : 'OpenAI';
      this.logger.log(`AI Semantic Content Moderation initialized with provider: ${provider}`);
    } else {
      this.logger.log('AI Semantic Moderation is in heuristic/local-only mode (no AI key set or explicitly disabled).');
    }
  }

  /**
   * Evaluates text through Tier 1 (local deterministic filter) and Tier 2 (AI Semantic Inspection).
   */
  async evaluateContent(text: string): Promise<AiModerationResult> {
    if (!text || typeof text !== 'string' || !text.trim()) {
      return { isValid: true, flaggedBy: 'CLEAN' };
    }

    const trimmed = text.trim();

    // ── Tier 1: Local Deterministic Rule-Based Normalization & Filter (0ms) ──
    if (containsProfanity(trimmed)) {
      return {
        isValid: false,
        reason: 'عذراً، يحتوي النص على كلمات أو عبارات غير لائقة تتعارض مع الآداب العامة للمنصة 🚫',
        flaggedBy: 'RULE_FILTER',
      };
    }

    // ── Tier 2: AI Semantic Verification (Contextual, Sarcasm & Bullying Detection) ──
    if (this.isAiEnabled) {
      try {
        const aiResult = await this.verifyWithAi(trimmed);
        if (!aiResult.isValid) {
          return {
            isValid: false,
            reason:
              aiResult.reason ||
              'عذراً، تم حظر المحتوى بواسطة نظام الذكاء الاصطناعي لاحتوائه على عبارات غير لائقة 🚫',
            flaggedBy: 'AI_SEMANTIC',
          };
        }
      } catch (err: any) {
        // Graceful degradation: If AI call fails/times out, log and do not block legitimate requests
        this.logger.warn(`AI Moderation request failed or timed out (${err.message}). Falling back to local filter result.`);
      }
    }

    return { isValid: true, flaggedBy: 'CLEAN' };
  }

  /**
   * Asserts clean content or throws a user-facing BadRequestException in Arabic.
   */
  async assertValidContent(text: string): Promise<void> {
    // Immediate sync check
    assertCleanContent(text);

    // AI Semantic check
    const result = await this.evaluateContent(text);
    if (!result.isValid) {
      throw new BadRequestException(result.reason);
    }
  }

  /**
   * Calls Google Gemini or OpenAI API to inspect context, nuance, and intent.
   */
  private async verifyWithAi(text: string): Promise<{ isValid: boolean; reason?: string | null }> {
    if (this.geminiApiKey) {
      return this.verifyWithGemini(text);
    }
    if (this.openaiApiKey) {
      return this.verifyWithOpenAi(text);
    }
    return { isValid: true };
  }

  /**
   * Calls Google Gemini Flash for ultra-fast, intelligent Arabic & English moderation.
   */
  private async verifyWithGemini(text: string): Promise<{ isValid: boolean; reason?: string | null }> {
    const model =
      this.configService.get<string>('GEMINI_MODEL') ||
      process.env.GEMINI_MODEL ||
      'gemini-3.5-flash-lite';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.geminiApiKey}`;

    const prompt = `You are an automated content moderation AI for an Egyptian & Arab educational learning platform ('El-Awal'). Your role is to determine whether a student or teacher comment/question is appropriate, respectful, and safe.

You MUST recognize and block insults and toxic content across three languages/formats:
1. Standard Arabic & Egyptian Slang (العامية المصرية والشتائم الدارجة).
2. Franco-Arabic / Chat Arabic / 3rabizi (e.g. 'a7a', 'kosomk', '5awal', 'ya 3ars', 'ebn el was5a', 'sharmouta', 'manyook', 'teezak', 'zobak', 'ga7ba', 'yel3an deenak', etc. using numbers like 2, 3, 5, 7, 8, 9 as Arabic letters).
3. English profanities, insults, slang, and abbreviations (e.g. 'fuck', 'bitch', 'shit', 'asshole', 'dick', 'cunt', 'stfu', 'motherfucker', 'kys', 'retard', etc.).

Criteria to BLOCK (isValid: false):
- Curse words, vulgarities, sexual innuendos or anatomy insults in Arabic, Franco, or English.
- Bullying, mocking, belittling, toxicity, or passive-aggressive insults aimed at teachers, staff, or other students (e.g. "شرحك فاشل", "انت مبتفهمش حاجة", "you are stupid", "mesh fahem 7aga mnk ya fashal").
- Harassment, hate speech, religious insults, or blasphemy.

Criteria to ALLOW (isValid: true):
- Legitimate educational questions or doubts about physics, math, Arabic grammar, biology, etc.
- Polite feedback or requests for further explanation.
- Polite greetings and gratitude (e.g. شكراً يا مستر, thank you, salam alaykom, shokran).

Analyze the following text and respond ONLY with a raw JSON object (no markdown formatting, no backticks):
{"isValid": boolean, "reason": string | null}
If invalid, provide reason in concise Arabic (e.g. "يحتوي النص على إهانة أو ألفاظ غير لائقة بالفرانكو/الإنجليزية").

Text to analyze:
"${text.replace(/"/g, '\\"')}"`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500); // 2.5s timeout guard

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json',
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`Gemini API HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) return { isValid: true };

      const cleanJson = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      return {
        isValid: Boolean(parsed.isValid),
        reason: parsed.reason || null,
      };
    } catch (err: any) {
      clearTimeout(timeout);
      throw err;
    }
  }

  /**
   * Calls OpenAI Moderation API or Chat Completion.
   */
  private async verifyWithOpenAi(text: string): Promise<{ isValid: boolean; reason?: string | null }> {
    const endpoint = 'https://api.openai.com/v1/moderations';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.openaiApiKey}`,
        },
        body: JSON.stringify({ input: text }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`OpenAI API HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const isFlagged = data?.results?.[0]?.flagged;
      if (isFlagged) {
        return {
          isValid: false,
          reason: 'عذراً، تم حظر المحتوى بواسطة نظام الذكاء الاصطناعي لاحتوائه على عبارات غير لائقة 🚫',
        };
      }
      return { isValid: true };
    } catch (err: any) {
      clearTimeout(timeout);
      throw err;
    }
  }
}
