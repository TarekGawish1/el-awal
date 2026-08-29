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

  it('should immediately block blatant profanities via Tier 1 without calling external AI', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch');

    const result = await service.evaluateContent('احا ايه دا');
    expect(result.isValid).toBe(false);
    expect(result.flaggedBy).toBe('RULE_FILTER');
    expect(fetchSpy).not.toHaveBeenCalled();

    const enResult = await service.evaluateContent('fuck you bitch');
    expect(enResult.isValid).toBe(false);
    expect(enResult.flaggedBy).toBe('RULE_FILTER');
    expect(fetchSpy).not.toHaveBeenCalled();

    const francoResult1 = await service.evaluateContent('a7a ya 5awal');
    expect(francoResult1.isValid).toBe(false);
    expect(francoResult1.flaggedBy).toBe('RULE_FILTER');

    const francoResult2 = await service.evaluateContent('kosomk ya 3ars');
    expect(francoResult2.isValid).toBe(false);
    expect(francoResult2.flaggedBy).toBe('RULE_FILTER');

    const francoResult3 = await service.evaluateContent('ebn el was5a');
    expect(francoResult3.isValid).toBe(false);
    expect(francoResult3.flaggedBy).toBe('RULE_FILTER');
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

    const result = await service.evaluateContent('شرحك مش مفهوم خالص وانت فاشل');
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
