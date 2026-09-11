import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from '../services/analytics.service';
import { AnalyticsController } from '../controllers/analytics.controller';
import { GeoLocationService } from '../services/geo-location.service';
import { PrismaService } from '../../../core/database/prisma.service';
import { UserRole } from '@prisma/client';

describe('Analytics & Telemetry Subsystem', () => {
  let service: AnalyticsService;
  let controller: AnalyticsController;
  let geoService: GeoLocationService;

  const mockPrisma: any = {
    pageView: {
      create: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
      findMany: jest.fn(),
    },
    landingVisit: {
      create: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
      findMany: jest.fn(),
    },
    userSession: {
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [
        AnalyticsService,
        GeoLocationService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    controller = module.get<AnalyticsController>(AnalyticsController);
    geoService = module.get<GeoLocationService>(GeoLocationService);
  });

  describe('Geo-Location Resolution Service', () => {
    it('prioritizes Cloudflare headers for country and city', () => {
      const geo = geoService.resolve('197.38.100.20', {
        'cf-ipcountry': 'EG',
        'cf-ipcity': 'Mansoura',
      });

      expect(geo.country).toBe('مصر');
      expect(geo.city).toBe('المنصورة');
      expect(geo.countryCode).toBe('EG');
    });

    it('translates Egyptian cities and governorates accurately', () => {
      expect(geoService.localizeCity('Cairo')).toBe('القاهرة');
      expect(geoService.localizeCity('Alexandria')).toBe('الإسكندرية');
      expect(geoService.localizeCity('Damietta')).toBe('دمياط');
      expect(geoService.localizeCity('Tanta')).toBe('طنطا');
    });

    it('gracefully handles localhost and private IP subnets', () => {
      const geoLocal = geoService.resolve('127.0.0.1');
      expect(geoLocal.country).toBe('مصر');
      expect(geoLocal.city).toContain('دمياط');

      const geoPrivate = geoService.resolve('192.168.1.55');
      expect(geoPrivate.country).toBe('مصر');
    });

    it('resolves Damietta via ISO governorate code DT or Cloudflare headers', () => {
      const geo = geoService.resolve('197.63.16.111', {
        'cf-ipcountry': 'EG',
        'cf-region-code': 'dt',
      });
      expect(geo.country).toBe('مصر');
      expect(geo.city).toBe('دمياط');
    });
  });

  describe('User Session & Heartbeat Telemetry', () => {
    it('starts an authenticated user session with resolved geo location', async () => {
      mockPrisma.userSession.create.mockResolvedValue({
        id: 'session-uuid-1',
        country: 'مصر',
        city: 'المنصورة',
      });

      const result = await service.startSession(
        'user-123',
        { tenantId: 'tenant-456' },
        '197.38.100.20',
        'Mozilla/5.0',
        { 'cf-ipcountry': 'EG', 'cf-ipcity': 'Mansoura' },
      );

      expect(result.sessionId).toBe('session-uuid-1');
      expect(result.city).toBe('المنصورة');
      expect(mockPrisma.userSession.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-123',
            tenantId: 'tenant-456',
            country: 'مصر',
            city: 'المنصورة',
          }),
        }),
      );
    });

    it('increments duration on heartbeat ping and clamps high values against idle tabs', async () => {
      mockPrisma.userSession.update.mockResolvedValue({
        id: 'session-uuid-1',
        durationSeconds: 120,
      });

      // Ping with 90 seconds -> should be clamped to 60s
      const pingRes = await service.pingSession({
        sessionId: 'session-uuid-1',
        elapsedSeconds: 90,
      });

      expect(pingRes.success).toBe(true);
      expect(mockPrisma.userSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            durationSeconds: { increment: 60 },
          }),
        }),
      );
    });
  });

  describe('Geographic Ranking', () => {
    it('aggregates and ranks locations with percentages', async () => {
      mockPrisma.landingVisit.findMany.mockResolvedValue([
        { country: 'مصر', city: 'القاهرة', visitorHash: 'hash-1' },
        { country: 'مصر', city: 'القاهرة', visitorHash: 'hash-2' },
        { country: 'مصر', city: 'المنصورة', visitorHash: 'hash-3' },
      ]);
      mockPrisma.userSession.findMany.mockResolvedValue([
        { country: 'مصر', city: 'الإسكندرية', userId: 'user-1' },
      ]);

      const res = await service.getGeoRanking({
        scope: 'all',
        groupBy: 'city',
        range: 'week',
      });

      expect(res.totalVisits).toBe(4);
      expect(res.items.length).toBeGreaterThanOrEqual(3);
      expect(res.items[0].name).toBe('القاهرة');
      expect(res.items[0].visitCount).toBe(2);
      expect(res.items[0].percentage).toBe(50);
      expect(res.items[0].rank).toBe(1);
    });
  });

  describe('Student Engagement Leaderboard', () => {
    it('ranks students by total active duration and formats hours/minutes', async () => {
      mockPrisma.userSession.findMany.mockResolvedValue([
        {
          userId: 'stu-1',
          durationSeconds: 3700, // ~1h 1m
          startedAt: new Date(),
          lastActiveAt: new Date(),
          city: 'المنصورة',
          country: 'مصر',
        },
        {
          userId: 'stu-2',
          durationSeconds: 1800, // 30m
          startedAt: new Date(),
          lastActiveAt: new Date(),
          city: 'القاهرة',
          country: 'مصر',
        },
      ]);

      mockPrisma.user.findMany.mockResolvedValue([
        {
          id: 'stu-1',
          fullName: 'أحمد محمود',
          phone: '01012345678',
          studentProfile: { studentCode: 'STU-101', gradeLevel: 'الصف الأول الثانوي' },
        },
        {
          id: 'stu-2',
          fullName: 'سارة إبراهيم',
          phone: '01198765432',
          studentProfile: { studentCode: 'STU-102', gradeLevel: 'الصف الأول الثانوي' },
        },
      ]);

      const res = await service.getStudentEngagementLeaderboard({
        sortBy: 'duration',
        range: 'month',
      });

      expect(res.students).toHaveLength(2);
      expect(res.students[0].studentName).toBe('أحمد محمود');
      expect(res.students[0].rank).toBe(1);
      expect(res.students[0].totalDurationFormatted).toContain('1 ساعة');
      expect(res.students[1].studentName).toBe('سارة إبراهيم');
      expect(res.students[1].rank).toBe(2);
    });
  });

  describe('Landing Stats', () => {
    it('queries landing visits count and unique visitors', async () => {
      mockPrisma.landingVisit.count.mockResolvedValue(50);
      mockPrisma.landingVisit.groupBy.mockResolvedValue([
        { visitorHash: 'h1' },
        { visitorHash: 'h2' },
      ]);

      const res = await service.getLandingStats({ range: 'week' });
      expect(res.totalViews).toBe(50);
      expect(res.uniqueVisitors).toBe(2);
    });
  });

  describe('Controller Route Protection & Ingestion', () => {
    it('POST /session/start initializes session with request headers', async () => {
      mockPrisma.userSession.create.mockResolvedValue({
        id: 'sess-1',
        country: 'مصر',
        city: 'القاهرة',
      });

      const mockReq: any = {
        headers: { 'x-forwarded-for': '127.0.0.1' },
        socket: { remoteAddress: '127.0.0.1' },
      };
      const user: any = { id: 'u1', role: UserRole.STUDENT };

      const res = await controller.startSession({}, user, mockReq);
      expect(res.sessionId).toBe('sess-1');
    });

    it('POST /session/ping updates session active time', async () => {
      mockPrisma.userSession.update.mockResolvedValue({
        id: 'sess-1',
        durationSeconds: 60,
      });

      const res = await controller.pingSession({ sessionId: 'b6e3f282-e30c-4395-814e-f82ad31057e0', elapsedSeconds: 30 });
      expect(res.success).toBe(true);
    });
  });
});
