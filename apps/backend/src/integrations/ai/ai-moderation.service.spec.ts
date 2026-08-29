import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { AiModerationService } from './ai-moderation.service';

describe('AiModerationService', () => {
  let service: AiModerationService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiModerationService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'GEMINI_API_KEY') return 'test-gemini-key';
              if (key === 'AI_MODERATION_ENABLED') return 'true';
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AiModerationService>(AiModerationService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should evaluate and block subtle inappropriate content via AI Semantic inspection', async () => {
    const mockGeminiResponse = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  isValid: false,
                  reason: 'يحتوي النص على ألفاظ نابية وإهانة',
                }),
              },
            ],
          },
        },
      ],
    };

    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => mockGeminiResponse,
    } as any);

    const result = await service.evaluateContent('أسلوبك محبط للطلاب');
    expect(result.isValid).toBe(false);
    expect(result.flaggedBy).toBe('AI_SEMANTIC');
    expect(result.reason).toContain('ألفاظ نابية');
  });

  it('should block known profanities locally before an AI verdict can allow them', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: JSON.stringify({ isValid: true }) }] } }],
      }),
    } as any);

    const directInsult = await service.evaluateContent('انت راجل مش محترم');
    expect(directInsult.isValid).toBe(false);
    expect(directInsult.flaggedBy).toBe('RULE_FILTER');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should block profanities via local filter if AI is unavailable', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('AI Service Offline'));

    const result = await service.evaluateContent('احا ايه دا');
    expect(result.isValid).toBe(false);
    expect(result.flaggedBy).toBe('RULE_FILTER');

    const francoResult = await service.evaluateContent('kooos amaak ya khawal');
    expect(francoResult.isValid).toBe(false);
    expect(francoResult.flaggedBy).toBe('RULE_FILTER');
  });

  it('should call Gemini API for clean-looking text and block subtle toxicity', async () => {
    const mockGeminiResponse = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  isValid: false,
                  reason: 'يحتوي النص على إهانة وتنمر موجه للمعلم',
                }),
              },
            ],
          },
        },
      ],
    };

    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockGeminiResponse,
    } as any);

    const result = await service.evaluateContent('أسلوبك محبط للطلاب');
    expect(result.isValid).toBe(false);
    expect(result.flaggedBy).toBe('AI_SEMANTIC');
    expect(result.reason).toContain('إهانة وتنمر');
  });

  it('should allow legitimate educational questions evaluated by AI', async () => {
    const mockGeminiResponse = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  isValid: true,
                  reason: null,
                }),
              },
            ],
          },
        },
      ],
    };

    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockGeminiResponse,
    } as any);

    const result = await service.evaluateContent('ما هو إعراب كلمة طالباً في جملة كان التلميذ مجتهداً؟');
    expect(result.isValid).toBe(true);
    expect(result.flaggedBy).toBe('CLEAN');
  });

  it('should degrade gracefully if AI API fails or times out', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network Timeout'));

    const result = await service.evaluateContent('سؤال عادي جداً');
    expect(result.isValid).toBe(true);
    expect(result.flaggedBy).toBe('CLEAN');
  });

  it('should throw BadRequestException in assertValidContent for invalid text', async () => {
    await expect(service.assertValidContent('كسمك')).rejects.toThrow(BadRequestException);
  });
});
