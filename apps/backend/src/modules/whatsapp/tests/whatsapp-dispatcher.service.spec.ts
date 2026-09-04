import { NotificationType, UserRole, WhatsAppStatus } from '@prisma/client';
import { WhatsAppDispatcherService } from '../services/whatsapp-dispatcher.service';

const queueNotification = (phone = '01012345678') => ({
  type: 'REGISTRATION_CREDENTIALS',
  notificationType: NotificationType.STUDENT_APPROVAL_CREDENTIALS,
  title: 'تم التسجيل',
  message: 'تم تسجيل الطالب',
  data: { phone, parentName: 'ولي الأمر', studentName: 'أحمد', studentPhone: phone },
  scheduledFor: new Date('2026-08-28T10:00:00.000Z'),
  recipient: { fullName: 'ولي الأمر', role: UserRole.PARENT },
});

const createService = (overrides: Record<string, unknown> = {}) => {
  const prisma = {
    whatsAppMessageLog: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    },
    ...overrides,
  };
  const whatsapp = { sendTrackedProtectedMessage: jest.fn() };
  const settingsService = { getEffectiveDeliveryChannel: jest.fn() };
  const config = { get: jest.fn((_: string, fallback: string) => fallback) };
  return {
    prisma,
    whatsapp,
    settingsService,
    service: new WhatsAppDispatcherService(prisma as never, whatsapp as never, settingsService as never, config as never),
  };
};

describe('WhatsAppDispatcherService', () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('normalizes local Egyptian numbers for WhatsApp', () => {
    const { service } = createService();

    expect(service.formatToWhatsAppInternational('010-1234-5678')).toBe('201012345678');
    expect(service.formatToWhatsAppInternational('+20 10 1234 5678')).toBe('201012345678');
  });

  it('persists simultaneous registration messages as queued records', async () => {
    const { prisma, service } = createService();
    prisma.whatsAppMessageLog.create.mockImplementation(async ({ data }: { data: unknown }) => data);

    const records = await Promise.all(
      Array.from({ length: 10 }, (_, index) =>
        service.enqueueNotification(queueNotification(`0101234567${index}`)),
      ),
    );

    expect(prisma.whatsAppMessageLog.create).toHaveBeenCalledTimes(10);
    expect(records).toEqual(expect.arrayContaining([
      expect.objectContaining({ status: WhatsAppStatus.QUEUED }),
    ]));
    expect(prisma.whatsAppMessageLog.create.mock.calls.every(
      ([call]: [{ data: { status: WhatsAppStatus; recipientPhone: string } }]) =>
        call.data.status === WhatsAppStatus.QUEUED && /^20\d{10}$/.test(call.data.recipientPhone),
    )).toBe(true);
  });

  it('marks an invalid recipient as a permanent failure without a retry', async () => {
    const { prisma, service } = createService();
    prisma.whatsAppMessageLog.create.mockImplementation(async ({ data }: { data: unknown }) => data);

    const record = await service.enqueueNotification(queueNotification('0100'));

    expect(record).toEqual(expect.objectContaining({
      status: WhatsAppStatus.PERMANENT_FAIL,
      failureReason: 'Invalid Egyptian international phone number',
    }));
    expect(prisma.whatsAppMessageLog.create.mock.calls[0][0].data).not.toHaveProperty('retryCount');
  });

  it('marks a non-existent WhatsApp user as a permanent failure without retrying', async () => {
    jest.useFakeTimers();
    const { prisma, whatsapp, service } = createService();
    prisma.whatsAppMessageLog.findFirst.mockResolvedValue({
      id: 'not-registered', recipientPhone: '201012345678', messageBody: 'message',
      retryCount: 0, maxRetries: 3, createdAt: new Date(),
    });
    prisma.whatsAppMessageLog.updateMany.mockResolvedValue({ count: 1 });
    prisma.whatsAppMessageLog.update.mockResolvedValue({});
    whatsapp.sendTrackedProtectedMessage.mockResolvedValue({ outcome: 'not_registered' });
    jest.spyOn(Math, 'random').mockReturnValue(0);

    const processing = service.processNextQueuedMessage();
    await jest.advanceTimersByTimeAsync(4_000);
    await processing;

    expect(prisma.whatsAppMessageLog.update).toHaveBeenCalledWith({
      where: { id: 'not-registered' },
      data: {
        status: WhatsAppStatus.PERMANENT_FAIL,
        failureReason: 'Phone is not registered on WhatsApp',
      },
    });
    expect(prisma.whatsAppMessageLog.update).not.toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ retryCount: expect.anything() }),
    }));
  });

  it('processes claimed records serially with a minimum four-second cooldown', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-28T10:00:00.000Z'));
    const { prisma, whatsapp, service } = createService();
    const messages = [
      { id: 'one', recipientPhone: '201012345678', messageBody: 'one', retryCount: 0, maxRetries: 3, createdAt: new Date() },
      { id: 'two', recipientPhone: '201112345678', messageBody: 'two', retryCount: 0, maxRetries: 3, createdAt: new Date() },
    ];
    prisma.whatsAppMessageLog.findFirst
      .mockResolvedValueOnce(messages[0])
      .mockResolvedValueOnce(messages[1]);
    prisma.whatsAppMessageLog.updateMany.mockResolvedValue({ count: 1 });
    prisma.whatsAppMessageLog.update.mockResolvedValue({});

    const sendTimes: number[] = [];
    whatsapp.sendTrackedProtectedMessage.mockImplementation(async () => {
      sendTimes.push(Date.now());
      return { outcome: 'sent', providerMessageId: 'provider-id' };
    });
    jest.spyOn(Math, 'random').mockReturnValue(0);

    const first = service.processNextQueuedMessage();
    await jest.advanceTimersByTimeAsync(4_000);
    await first;
    const second = service.processNextQueuedMessage();
    await jest.advanceTimersByTimeAsync(4_000);
    await second;

    expect(whatsapp.sendTrackedProtectedMessage).toHaveBeenCalledTimes(2);
    expect(sendTimes[1] - sendTimes[0]).toBeGreaterThanOrEqual(4_000);
    expect(prisma.whatsAppMessageLog.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: { status: WhatsAppStatus.SENDING },
    }));
  });
});
