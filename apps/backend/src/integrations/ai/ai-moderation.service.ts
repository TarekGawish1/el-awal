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
    const prompt = `You are an automated content moderation AI for an Egyptian & Arab educational learning platform ('El-Awal'). Your role is to determine whether a student or teacher comment/question/reply is appropriate, respectful, and safe.

You MUST recognize and block insults, vulgarities, bullying, and toxic content across three languages/formats:
1. Standard Arabic & Egyptian Slang (العامية المصرية والشتائم والإهانات مثل: غبي، انت غبي، يا غبي، حمار، يا حمار، حيوان، كلب، اهبل، متخلف، فاشل، حقير، تافه، سافل، واطي، قذر، نجس، وسخ، كسمك، احا، شرموطة، خول، عرص، منيوك، متناك، طيز، زب، يلعن دينك، ابن الكلب، ابن الوسخة).
2. Franco-Arabic / Chat Arabic / 3rabizi (e.g. 'ghabi', 'ya ghabi', 'enta ghabi', '7mar', 'ya 7mar', 'hayawan', 'kalb', 'ahbal', 'motakhalef', 'fashal', 'fashel', 'was5', 'wes5', 'najes', 'safel', 'tafeh', 'kooos amaak', 'kos omak', 'khawal', '5awal', 'a7a', 'ya 3ars', 'ebn el was5a', 'sharmouta', 'manyook', 'teezak', 'zobak', 'ga7ba', 'yel3an deenak').
3. English profanities, insults, slang, and abbreviations (e.g. 'you are stupid', 'stupid', 'idiot', 'moron', 'dumb', 'loser', 'fuck', 'bitch', 'shit', 'asshole', 'dick', 'cunt', 'stfu', 'motherfucker', 'kys', 'retard').

Criteria to BLOCK (isValid: false):
- Direct insults, name-calling, or slurs towards teachers, students, or parents (e.g. "انت غبي", "يا حمار", "انت متخلف", "شرحك زبالة", "you are stupid", "enta ghabi").
- Curse words, vulgarities, sexual innuendos or anatomy insults in Arabic, Franco, or English.
- Bullying, mocking, belittling, toxicity, or passive-aggressive insults aimed at teachers, staff, or other students (e.g. "شرحك فاشل", "انت مبتفهمش حاجة", "mesh fahem 7aga mnk ya fashal").
- Harassment, hate speech, religious insults, or blasphemy.

Criteria to ALLOW (isValid: true):
- Legitimate educational questions or doubts about physics, math, Arabic grammar, biology, etc.
- Polite feedback or requests for further explanation (e.g. "مش فاهم الجزئية دي ممكن توضيح؟", "could you please explain step 2?").
- Polite greetings and gratitude (e.g. "شكراً يا مستر", "جزاك الله خيراً", "thank you", "salam alaykom", "shokran").

Analyze the following text and respond ONLY with a raw JSON object (no markdown formatting, no backticks):
{"isValid": boolean, "reason": string | null}
If invalid, provide reason in concise Arabic (e.g. "يحتوي النص على إهانة أو ألفاظ غير لائقة بالفرانكو/العربية").

Text to analyze:
"${text.replace(/"/g, '\\"')}"`;

    let lastAiError: any = null;

    if (this.geminiApiKey) {
      try {
        return await this.verifyWithGemini(text, prompt);
      } catch (err: any) {
        lastAiError = err;
        this.logger.warn(`Gemini verification failed (${err.message}). Trying OpenAI if available.`);
      }
    }

    if (this.openaiApiKey) {
      try {
        return await this.verifyWithOpenAi(text, prompt);
      } catch (err: any) {
        lastAiError = err;
        this.logger.warn(`OpenAI verification failed (${err.message}).`);
      }
    }

    if (lastAiError) {
      throw lastAiError;
    }

    return { isValid: true };
  }

  /**
   * Calls Google Gemini for ultra-fast, intelligent multilingual moderation.
   */
  private async verifyWithGemini(text: string, prompt: string): Promise<{ isValid: boolean; reason?: string | null }> {
    const configuredModel =
      this.configService.get<string>('GEMINI_MODEL') ||
      process.env.GEMINI_MODEL ||
      'gemini-3.6-flash';

    const modelsToTry = [
      configuredModel,
      'gemini-3.6-flash',
      'gemini-3.5-flash',
      'gemini-2.0-flash',
      'gemini-1.5-flash',
    ];
    const uniqueModels = Array.from(new Set(modelsToTry.filter(Boolean)));

    let lastError: any = null;

    for (const model of uniqueModels) {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.geminiApiKey}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4500);

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            safetySettings: [
              { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
              { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
              { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
              { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
            ],
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

        // Check if prompt was blocked by native safety filters
        if (data?.promptFeedback?.blockReason || data?.candidates?.[0]?.finishReason === 'SAFETY') {
          return {
            isValid: false,
            reason: 'تم حظر المحتوى تلقائياً بواسطة معايير الأمان لاحتوائه على ألفاظ مسيئة 🚫',
          };
        }

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
        if (err.message && (err.message.includes('HTTP 404') || err.message.includes('HTTP 429') || err.message.includes('HTTP 503'))) {
          continue;
        }
        break;
      }
    }

    throw lastError || new Error('Gemini verification failed');
  }

  /**
   * Calls OpenAI Chat Completion for intelligent fallback moderation.
   */
  private async verifyWithOpenAi(text: string, prompt: string): Promise<{ isValid: boolean; reason?: string | null }> {
    const endpoint = 'https://api.openai.com/v1/chat/completions';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.openaiApiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
          temperature: 0.1,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`OpenAI API HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const rawText = data?.choices?.[0]?.message?.content;
      if (!rawText) return { isValid: true };

      const parsed = JSON.parse(rawText.trim());
      return {
        isValid: Boolean(parsed.isValid),
        reason: parsed.reason || null,
      };
    } catch (err: any) {
      clearTimeout(timeout);
      throw err;
    }
  }
}
