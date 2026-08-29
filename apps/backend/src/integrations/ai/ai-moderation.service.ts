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
   * Evaluates text using intelligent AI Semantic inspection (with local fallback if AI is disabled).
   */
  async evaluateContent(text: string): Promise<AiModerationResult> {
    if (!text || typeof text !== 'string' || !text.trim()) {
      return { isValid: true, flaggedBy: 'CLEAN' };
    }

    const trimmed = text.trim();

    // ── Tier 1: AI Semantic Intelligence Verification (Intent, Slang, Franco, Bullying) ──
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
        return { isValid: true, flaggedBy: 'CLEAN' };
      } catch (err: any) {
        this.logger.warn(`AI Moderation request failed (${err.message}). Falling back to local filter.`);
      }
    }

    // ── Tier 2: Local Rule Filter (Only as fallback when AI API is unavailable) ──
    if (containsProfanity(trimmed)) {
      return {
        isValid: false,
        reason: 'عذراً، يحتوي النص على كلمات أو عبارات غير لائقة تتعارض مع الآداب العامة للمنصة 🚫',
        flaggedBy: 'RULE_FILTER',
      };
    }

    return { isValid: true, flaggedBy: 'CLEAN' };
  }

  /**
   * Asserts valid content using AI semantic intelligence or throws a user-facing BadRequestException.
   */
  async assertValidContent(text: string): Promise<void> {
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
   * Calls Google Gemini Flash for ultra-fast, intelligent multilingual moderation.
   */
  private async verifyWithGemini(text: string): Promise<{ isValid: boolean; reason?: string | null }> {
    const configuredModel =
      this.configService.get<string>('GEMINI_MODEL') ||
      process.env.GEMINI_MODEL ||
      'gemini-3.5-flash-lite';

    const modelsToTry = [configuredModel, 'gemini-3.5-flash-lite', 'gemini-3.6-flash'];
    // Deduplicate models
    const uniqueModels = Array.from(new Set(modelsToTry.filter(Boolean)));

    const prompt = `You are an automated content moderation AI for an Egyptian & Arab educational learning platform ('El-Awal'). Your role is to determine whether a student or teacher comment/question is appropriate, respectful, and safe.

You MUST recognize and block insults, vulgarities, and toxic content across three languages/formats:
1. Standard Arabic & Egyptian Slang (العامية المصرية والشتائم الدارجة مثل: كسمك، احا، شرموطة، خول، عرص، منيوك، متناك، طيز، زب، يلعن دينك، ابن الكلب، ابن الوسخة).
2. Franco-Arabic / Chat Arabic / 3rabizi (e.g. 'kooos amaak', 'kos omak', 'khawal', '5awal', 'a7a', 'ya 3ars', 'ebn el was5a', 'sharmouta', 'manyook', 'teezak', 'zobak', 'ga7ba', 'yel3an deenak', etc. using numbers like 2, 3, 5, 7, 8, 9 or letters like kh, 5, 3, 7).
3. English profanities, insults, slang, and abbreviations (e.g. 'fuck', 'bitch', 'shit', 'asshole', 'dick', 'cunt', 'stfu', 'motherfucker', 'kys', 'retard', etc.).

Criteria to BLOCK (isValid: false):
- Curse words, vulgarities, sexual innuendos or anatomy insults in Arabic, Franco, or English.
- Direct or indirect insults towards students, teachers, or parents (e.g. "kooos amaak", "ya khawal", "ya 3ars", "ebn el wes5a").
- Bullying, mocking, belittling, toxicity, or passive-aggressive insults aimed at teachers, staff, or other students (e.g. "شرحك فاشل", "انت مبتفهمش حاجة", "you are stupid", "mesh fahem 7aga mnk ya fashal").
- Harassment, hate speech, religious insults, or blasphemy.

Criteria to ALLOW (isValid: true):
- Legitimate educational questions or doubts about physics, math, Arabic grammar, biology, etc.
- Polite feedback or requests for further explanation.
- Polite greetings and gratitude (e.g. شكراً يا مستر, thank you, salam alaykom, shokran).

Analyze the following text and respond ONLY with a raw JSON object (no markdown formatting, no backticks):
{"isValid": boolean, "reason": string | null}
If invalid, provide reason in concise Arabic (e.g. "يحتوي النص على إهانة أو ألفاظ غير لائقة بالفرانكو/العربية").

Text to analyze:
"${text.replace(/"/g, '\\"')}"`;

    let lastError: any = null;

    for (const model of uniqueModels) {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.geminiApiKey}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500); // 3.5s timeout guard

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
          throw new Error(`Gemini API [${model}] HTTP ${response.status}: ${response.statusText}`);
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
        lastError = err;
        // If it's a 404 (model not found), try the next fallback model
        if (err.message && err.message.includes('HTTP 404')) {
          continue;
        }
        break;
      }
    }

    throw lastError || new Error('Gemini verification failed');
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
