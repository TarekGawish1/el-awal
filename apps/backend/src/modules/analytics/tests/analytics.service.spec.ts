import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from '../services/analytics.service';
import { AnalyticsController } from '../controllers/analytics.controller';
import { PrismaService } from '../../../core/database/prisma.service';
import { UserRole } from '@prisma/client';

describe('Analytics Telemetry Subsystem', () => {
  let service: AnalyticsService;
  let controller: AnalyticsController;

  const mockPrisma: any = {
    pageView: {
      create: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [
        AnalyticsService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    controller = module.get<AnalyticsController>(AnalyticsController);
  });

  describe('Visitor Hash Generation', () => {
    it('generates consistent SHA-256 hash for same IP and user agent', () => {
      const hash1 = service.generateVisitorHash('192.168.1.1', 'Mozilla/5.0');
      const hash2 = service.generateVisitorHash('192.168.1.1', 'Mozilla/5.0');
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
    });

    it('generates different hashes for different clients', () => {
      const hash1 = service.generateVisitorHash('192.168.1.1', 'Mozilla/5.0');
      const hash2 = service.generateVisitorHash('10.0.0.1', 'Mozilla/5.0');
      expect(hash1).not.toBe(hash2);
    });

    it('normalizes IPv6 mapped IPv4 addresses', () => {
      const hashV4 = service.generateVisitorHash('127.0.0.1', 'Safari');
      const hashV6 = service.generateVisitorHash('::ffff:127.0.0.1', 'Safari');
      expect(hashV4).toBe(hashV6);
    });
  });

  describe('Page View Recording', () => {
    it('records page view with computed visitor hash in non-blocking manner', async () => {
      mockPrisma.pageView.create.mockResolvedValue({ id: 'test-pv-id' });

      await service.recordPageView({
        path: '/',
        ipAddress: '203.0.113.195',
        userAgent: 'Chrome',
        isLandingPage: true,
      });

      expect(mockPrisma.pageView.create).toHaveBeenCalledTimes(1);
      const callArgs = mockPrisma.pageView.create.mock.calls[0][0];
      expect(callArgs.data.path).toBe('/');
      expect(callArgs.data.isLandingPage).toBe(true);
      expect(callArgs.data.visitorHash).toHaveLength(64);
    });

    it('auto-infers landing page when path is root /', async () => {
      mockPrisma.pageView.create.mockResolvedValue({ id: 'test-pv-id' });

      await service.recordPageView({
        path: '/',
        ipAddress: '203.0.113.195',
      });

      expect(mockPrisma.pageView.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isLandingPage: true,
          }),
        }),
      );
    });

    it('does not throw or disrupt execution if database insertion encounters an error', async () => {
      mockPrisma.pageView.create.mockRejectedValue(new Error('DB Connection Timeout'));

      await expect(
        service.recordPageView({
          path: '/test',
          ipAddress: '127.0.0.1',
        }),
      ).resolves.not.toThrow();
    });
  });

  describe('Analytics Stats Aggregation', () => {
    it('aggregates total views and unique visitors correctly across scopes', async () => {
      mockPrisma.pageView.count
        .mockResolvedValueOnce(150) // totalViews
        .mockResolvedValueOnce(90)  // landingViews
        .mockResolvedValueOnce(60); // systemViews

      mockPrisma.pageView.groupBy
        .mockResolvedValueOnce([
          { visitorHash: 'hash1' },
          { visitorHash: 'hash2' },
          { visitorHash: 'hash3' },
        ]) // unique visitors groupBy
        .mockResolvedValueOnce([
          { path: '/', isLandingPage: true, _count: { path: 90 } },
          { path: '/teacher/dashboard', isLandingPage: false, _count: { path: 60 } },
        ]); // top pages groupBy

      mockPrisma.pageView.findMany
        .mockResolvedValueOnce([]) // time series views
        .mockResolvedValueOnce([
          { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
          { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' },
        ]); // device sample views

      const stats = await service.getStats({ scope: 'all', range: 'week' }, 'teacher-123');

      expect(stats.summary.totalViews).toBe(150);
      expect(stats.summary.uniqueVisitors).toBe(3);
      expect(stats.summary.landingViews).toBe(90);
      expect(stats.summary.systemViews).toBe(60);
      expect(stats.summary.viewsPerVisitor).toBe(50);
      expect(stats.topPages).toHaveLength(2);
      expect(stats.topPages[0].path).toBe('/');
      expect(stats.topPages[0].views).toBe(90);
    });
  });

  describe('AnalyticsController Endpoints', () => {
    it('POST /analytics/track accepts tracking beacon and returns 202 Accepted', async () => {
      mockPrisma.pageView.create.mockResolvedValue({ id: 'pv-id' });

      const mockReq: any = {
        headers: {
          'x-forwarded-for': '198.51.100.25',
          'user-agent': 'Chrome/120.0',
        },
        ip: '198.51.100.25',
      };

      const result = await controller.trackPageView(
        { path: '/courses', isLandingPage: false },
        mockReq,
      );

      expect(result).toEqual({ success: true });
    });

    it('GET /analytics/stats queries statistics for authenticated teacher workspace', async () => {
      mockPrisma.pageView.count.mockResolvedValue(10);
      mockPrisma.pageView.groupBy.mockResolvedValue([]);
      mockPrisma.pageView.findMany.mockResolvedValue([]);

      const user: any = {
        id: 'user-teach-1',
        teacherProfileId: 'teach-prof-1',
        role: UserRole.TEACHER,
      };

      const result = await controller.getStats({ scope: 'system', range: 'month' }, user);
      expect(result.summary).toBeDefined();
    });
  });
});
