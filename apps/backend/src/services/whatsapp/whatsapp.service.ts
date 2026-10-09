import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../core/database/prisma.service';
import { WhatsAppStatus, UserRole, NotificationChannel, NotificationType } from '@prisma/client';
import { usePgAuthState } from './pg-auth';
import * as QRCode from 'qrcode';

type ConnectionStatus = 'connecting' | 'open' | 'close' | 'qr' | 'banned';

type ProtectedSendOutcome = 'sent' | 'not_registered' | 'not_connected' | 'error';

interface ProtectedSendResult {
  outcome: ProtectedSendOutcome;
  providerMessageId?: string;
  failureReason?: string;
}

/**
 * WhatsAppService — manages the Baileys WA socket lifecycle with anti-ban hardening.
 *
 * Architecture notes:
 * - Initializes on module startup via onModuleInit()
 * - Auth state is persisted to PostgreSQL (WhatsAppAuthSession table)
 *   so sessions survive Heroku Eco dyno restarts and cold deploys
 * - The socket is auto-reconnected on transient disconnections
 * - On LOGOUT the session is cleared from the DB and a new QR is generated
 *
 * Anti-ban measures built into sendProtectedMessage():
 * - Contact existence validation (sock.onWhatsApp)
 * - Human typing/composing presence simulation
 * - Randomized pre-send typing delay (2.0s – 4.5s)
 */
@Injectable()
export class WhatsAppService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WhatsAppService.name);

  private socket: unknown = null;
  private qrCode: string | null = null;
  private connectionStatus: ConnectionStatus = 'connecting';
  private connectedNumber: string | null = null;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private isDestroyed = false;

  // Ban tracking and detection
  private isBanned = false;
  private banReason: string | null = null;
  private bannedAt: Date | null = null;

  // Baileys modules loaded via dynamic import (it's an ESM package)
  private baileys: {
    makeWASocket: (opts: unknown) => unknown;
    DisconnectReason: Record<string, unknown>;
    fetchLatestBaileysVersion: () => Promise<{ version: [number, number, number] }>;
    makeCacheableSignalKeyStore: (keys: unknown, logger: unknown) => unknown;
    delay: (ms: number) => Promise<void>;
    useMultiFileAuthState?: unknown;
  } | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    const enabled = this.config.get<string>('WHATSAPP_ENABLED', 'true');
    const isDev = this.config.get<string>('NODE_ENV') === 'development';
    const enableLocal = this.config.get<string>('ENABLE_LOCAL_WHATSAPP') === 'true';

    if (enabled === 'false' || (isDev && !enableLocal)) {
      this.logger.warn(
        'WhatsApp socket integration disabled in local development to preserve production session. (Set ENABLE_LOCAL_WHATSAPP=true to enable locally)',
      );
      return;
    }
    await this.loadBanState();
    await this.initSocket();
  }

  onModuleDestroy() {
    this.isDestroyed = true;
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.closeSocket();
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  /**
   * Returns the current connection status, connected number, QR code (base64 PNG) if available,
   * and any ban details detected by Baileys.
   */
  getStatus(): {
    connected: boolean;
    status: ConnectionStatus;
    qr?: string | null;
    connectedNumber?: string | null;
    isBanned: boolean;
    banReason?: string | null;
    bannedAt?: Date | null;
  } {
    return {
      connected: this.connectionStatus === 'open',
      status: this.isBanned ? 'banned' : this.connectionStatus,
      qr: this.qrCode,
      connectedNumber: this.connectedNumber,
      isBanned: this.isBanned,
      banReason: this.banReason,
      bannedAt: this.bannedAt,
    };
  }

  /**
   * Disconnects existing WhatsApp session, clears PostgreSQL auth credentials,
   * clears any recorded ban state, and reinitializes socket to immediately generate a fresh QR code.
   */
  async resetSession(): Promise<{ success: boolean; message: string }> {
    this.logger.warn('🔄 Manually resetting WhatsApp session & clearing credentials for new number pairing...');
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.closeSocket();
    await this.clearAuthSession();
    await this.clearBanState();

    this.isBanned = false;
    this.banReason = null;
    this.bannedAt = null;
    this.connectionStatus = 'connecting';
    this.qrCode = null;
    this.connectedNumber = null;

    // Small pause then spin up fresh socket
    setTimeout(() => {
      if (!this.isDestroyed) {
        this.initSocket();
      }
    }, 1000);

    return {
      success: true,
      message: 'تمت إعادة ضبط جلسة الواتساب ومسح بيانات الاعتماد بنجاح. جاري توليد كود QR جديد للربط.',
    };
  }

  /**
   * Simple legacy send — used only for direct one-off sends.
   * Normalizes Egyptian numbers: 01XXXXXXXXX → 201XXXXXXXXX@s.whatsapp.net
   * For queue processing use sendProtectedMessage() instead.
   *
   * @returns true if sent successfully, false otherwise
   */
  async sendMessage(phone: string, text: string): Promise<boolean> {
    if (this.connectionStatus !== 'open' || !this.socket) {
      this.logger.warn(
        `WhatsApp not connected (status=${this.connectionStatus}). Cannot send to ${phone}`,
      );
      return false;
    }

    try {
      const jid = this.normalizePhoneToJid(phone);
      const sock = this.socket as {
        sendMessage: (jid: string, content: unknown) => Promise<unknown>;
      };
      await sock.sendMessage(jid, { text });
      this.logger.log(`✅ WhatsApp message sent to ${jid}`);
      return true;
    } catch (error) {
      this.logger.error(`❌ Failed to send WhatsApp message to ${phone}`, error);
      return false;
    }
  }

  /**
   * Alias for sendMessage to support various service conventions
   */
  async sendTextMessage(phone: string, text: string): Promise<boolean> {
    return this.sendMessage(phone, text);
  }

  /**
   * Anti-ban protected message delivery.
   *
   * Steps:
   * 1. Validates number exists on WhatsApp (avoids dead-number delivery flags)
   * 2. Subscribes to presence for the JID
   * 3. Sends "composing" presence (human typing simulation)
   * 4. Waits a randomized typing delay (2,000 – 4,500ms)
   * 5. Clears composing presence ("paused")
   * 6. Sends the actual message
   *
   * @returns 'sent' | 'not_registered' | 'not_connected' | 'error'
   */
  async sendProtectedMessage(
    phone: string,
    text: string,
  ): Promise<ProtectedSendOutcome> {
    return (await this.sendTrackedProtectedMessage(phone, text)).outcome;
  }

  /**
   * Same anti-ban-protected send flow, with the Baileys message ID retained for
   * persistent dispatch/delivery tracking. Callers must still be sequential.
   */
  async sendTrackedProtectedMessage(
    phone: string,
    text: string,
  ): Promise<ProtectedSendResult> {
    if (this.connectionStatus !== 'open' || !this.socket) {
      this.logger.warn(
        `WhatsApp not connected (status=${this.connectionStatus}). Cannot send to ${phone}`,
      );
      return { outcome: 'not_connected', failureReason: 'WhatsApp socket is not connected' };
    }

    const jid = this.normalizePhoneToJid(phone);
    const sock = this.socket as {
      onWhatsApp?: (jid: string) => Promise<Array<{ exists: boolean; jid: string }>>;
      presenceSubscribe?: (jid: string) => Promise<void>;
      sendPresenceUpdate?: (type: string, jid: string) => Promise<void>;
      sendMessage: (jid: string, content: unknown) => Promise<unknown>;
    };

    try {
      // Best-effort existence check without blocking send
      try {
        if (typeof sock.onWhatsApp === 'function') {
          const results = await sock.onWhatsApp(jid);
          if (Array.isArray(results) && results.length > 0 && results[0]?.exists === false) {
            this.logger.warn(`[AntiBan] Number ${phone} is NOT registered on WhatsApp — skipping`);
            return { outcome: 'not_registered' };
          }
        }
      } catch (err: any) {
        this.logger.debug(`onWhatsApp check skipped: ${err?.message}`);
      }

      await sock.presenceSubscribe?.(jid).catch(() => undefined);
      await sock.sendPresenceUpdate?.('composing', jid).catch(() => undefined);

      const typingDelay = this.randomBetween(1_000, 2_500);
      await this.sleep(typingDelay);
      await sock.sendPresenceUpdate?.('paused', jid).catch(() => undefined);

      const response = await sock.sendMessage(jid, { text });
      const providerMessageId = (response as { key?: { id?: string } } | undefined)?.key?.id;
      this.logger.log(
        `✅ [AntiBan] Protected message sent successfully to ${jid} (providerId: ${providerMessageId})`,
      );
      return { outcome: 'sent', providerMessageId };
    } catch (error) {
      const failureReason = error instanceof Error ? error.message : 'Unknown WhatsApp gateway error';
      this.logger.error(`❌ Failed to send protected WhatsApp message to ${phone}`, error);

      // Check if send failure was caused by an account ban
      const lower = failureReason.toLowerCase();
      if (lower.includes('banned') || lower.includes('403') || lower.includes('blocked')) {
        void this.handleBanDetected(`فشل إرسال الرسالة بسبب حظر الرقم: ${failureReason}`);
      }

      return { outcome: 'error', failureReason };
    }
  }

  // ─── Internal Helpers ───────────────────────────────────────────────────────

  private async initSocket() {
    this.closeSocket();
    try {
      // Lazy-load the ESM Baileys package
      if (!this.baileys) {
        this.baileys = (await import('@whiskeysockets/baileys')) as unknown as typeof this.baileys;
      }

      const { makeWASocket, DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore } =
        this.baileys!;

      const { version } = await fetchLatestBaileysVersion();
      this.logger.log(`Baileys version: ${version.join('.')}`);

      // Load auth state from PostgreSQL
      const { state, saveCreds } = await usePgAuthState(this.prisma);

      // Suppress Baileys' internal verbose logging in production
      const P = await import('pino');
      const baileysLogger = P.default({ level: 'silent' });

      const sock = makeWASocket({
        version,
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, baileysLogger),
        },
        printQRInTerminal: false, // We handle QR ourselves
        logger: baileysLogger,
        browser: ['El-Awal Platform', 'Chrome', '120.0.0'],
        generateHighQualityLinkPreview: false,
        connectTimeoutMs: 60_000,
        keepAliveIntervalMs: 10_000,
      }) as {
        ev: {
          on: (event: string, handler: (...args: unknown[]) => void) => void;
          removeAllListeners: (event?: string) => void;
        };
        logout: () => Promise<void>;
        onWhatsApp: (jid: string) => Promise<Array<{ exists: boolean; jid: string }>>;
        presenceSubscribe: (jid: string) => Promise<void>;
        sendPresenceUpdate: (type: string, jid: string) => Promise<void>;
        sendMessage: (jid: string, content: unknown) => Promise<unknown>;
      };

      this.socket = sock;

      // ── Event: credentials updated (save to Postgres) ──
      sock.ev.on('creds.update', saveCreds);

      // Baileys emits outgoing message acknowledgement updates. A delivery or
      // read acknowledgement is sufficient to mark the persisted record delivered.
      sock.ev.on('messages.update', (updates: unknown) => {
        void this.recordDeliveryReceipts(updates);
      });

      // ── Event: connection state changes ──
      sock.ev.on('connection.update', async (update: unknown) => {
        const { connection, lastDisconnect, qr } = update as {
          connection?: string;
          lastDisconnect?: {
            error?: {
              output?: { statusCode?: number; payload?: { message?: string } };
              message?: string;
              data?: { reason?: string };
            };
          };
          qr?: string;
        };

        if (qr) {
          this.connectionStatus = 'qr';
          try {
            this.qrCode = await QRCode.toDataURL(qr, { margin: 2, scale: 8 });
            this.logger.log('📱 New WhatsApp QR code generated as Data URL. Scan to pair.');
          } catch (qrErr) {
            this.logger.error('Failed to convert QR to Data URL, fallback to raw string', qrErr);
            this.qrCode = qr;
          }
        }

        if (connection === 'open') {
          this.connectionStatus = 'open';
          this.qrCode = null;
          this.isBanned = false;
          this.banReason = null;
          this.bannedAt = null;
          await this.clearBanState();

          const user = (sock as any)?.user;
          this.connectedNumber = user?.id ? user.id.split(':')[0].replace(/[^0-9]/g, '') : 'Active';
          this.logger.log(`✅ WhatsApp connected and ready (Number: ${this.connectedNumber})`);
        }

        if (connection === 'close') {
          this.closeSocket();
          this.connectedNumber = null;

          const err = lastDisconnect?.error as any;
          const statusCode = err?.output?.statusCode;
          const errorMessage = String(err?.message || '').toLowerCase();
          const errorPayloadMsg = String(err?.output?.payload?.message || '').toLowerCase();
          const errorReason = String(err?.data?.reason || '').toLowerCase();

          // ── Explicit Ban Detection ──
          const isBanned =
            statusCode === 403 ||
            errorMessage.includes('banned') ||
            errorMessage.includes('blocked') ||
            errorMessage.includes('account was banned') ||
            errorPayloadMsg.includes('banned') ||
            errorPayloadMsg.includes('forbidden') ||
            errorReason.includes('banned');

          if (isBanned) {
            const reasonText = statusCode === 403
              ? 'تم حظر رقم الهاتف من قِبل سيرفرات واتساب (كود 403 Forbidden)'
              : `تم اكتشاف حظر الحساب: ${err?.message || 'تم الإبلاغ عن الرقم'}`;
            this.logger.error(`🚨 [WhatsAppService] WhatsApp number is BANNED! (${reasonText})`);
            await this.handleBanDetected(reasonText);
            return; // Do not auto-reconnect immediately when banned
          }

          this.connectionStatus = 'close';
          const { DisconnectReason: DR } = (this.baileys || {}) as { DisconnectReason?: Record<string, unknown> };
          const isLoggedOut =
            (DR && statusCode === (DR.loggedOut as number)) ||
            statusCode === 401;
          const isConnectionReplaced =
            (DR && statusCode === (DR.connectionReplaced as number)) ||
            statusCode === 440;

          if (isLoggedOut) {
            this.logger.warn(`🔐 WhatsApp session logged out from mobile (code=${statusCode}). Clearing PG auth and generating fresh QR...`);
            await this.clearAuthSession();
          } else if (isConnectionReplaced) {
            this.logger.warn(`⚠️ WhatsApp connection replaced by another instance/device (code=${statusCode}). Backing off reconnect for 30s without clearing auth keys.`);
            if (!this.isDestroyed) {
              this.reconnectTimeout = setTimeout(() => this.initSocket(), 30_000);
            }
            return;
          } else {
            this.logger.warn(`🔄 WhatsApp disconnected (code=${statusCode}). Reconnecting in 5s...`);
          }

          if (!this.isDestroyed) {
            this.reconnectTimeout = setTimeout(() => this.initSocket(), 5_000);
          }
        }
      });
    } catch (error) {
      this.logger.error('Failed to initialize WhatsApp socket', error);
      this.closeSocket();
      if (!this.isDestroyed) {
        this.reconnectTimeout = setTimeout(() => this.initSocket(), 10_000);
      }
    }
  }

  private closeSocket() {
    try {
      const sock = this.socket as {
        ev?: { removeAllListeners: (event?: string) => void };
        end?: (err: unknown) => void;
        ws?: { close: () => void; removeAllListeners?: () => void };
      } | null;

      if (sock?.ev) {
        sock.ev.removeAllListeners();
      }
      if (sock?.ws && typeof sock.ws.removeAllListeners === 'function') {
        sock.ws.removeAllListeners();
      }
      if (typeof sock?.end === 'function') {
        sock.end(undefined);
      } else if (sock?.ws && typeof sock.ws.close === 'function') {
        sock.ws.close();
      }
    } catch {
      // ignore
    }
    this.socket = null;
  }

  private async recordDeliveryReceipts(updates: unknown): Promise<void> {
    if (!Array.isArray(updates)) return;

    for (const entry of updates) {
      const receipt = entry as { key?: { id?: string; fromMe?: boolean }; update?: { status?: number } };
      const messageId = receipt.key?.id;
      // Baileys acknowledgement values >= 3 represent delivered/read/played.
      if (!receipt.key?.fromMe || !messageId || (receipt.update?.status ?? 0) < 3) continue;

      try {
        await this.prisma.whatsAppMessageLog.updateMany({
          where: { providerMessageId: messageId, status: WhatsAppStatus.SENT },
          data: { status: WhatsAppStatus.DELIVERED, deliveredAt: new Date() },
        });
      } catch (error) {
        this.logger.warn(`Failed to record WhatsApp delivery receipt for ${messageId}`, error);
      }
    }
  }

  private async clearAuthSession() {
    try {
      await this.prisma.whatsAppAuthSession.deleteMany();
      this.logger.log('🗑️ WhatsApp auth session cleared from PostgreSQL');
    } catch (error) {
      this.logger.error('Failed to clear WhatsApp auth session', error);
    }
  }

  // ─── Ban Detection & Storage Helpers ────────────────────────────────────────

  private async loadBanState() {
    try {
      const record = await this.prisma.systemSetting.findUnique({
        where: { key: 'WHATSAPP_BAN_STATE' },
      });
      if (record && record.value && typeof record.value === 'object') {
        const val = record.value as Record<string, unknown>;
        if (val.isBanned) {
          this.isBanned = true;
          this.banReason = typeof val.banReason === 'string' ? val.banReason : 'تم حظر الحساب من قِبل شركة واتساب';
          this.bannedAt = typeof val.bannedAt === 'string' ? new Date(val.bannedAt) : new Date();
          this.connectionStatus = 'banned';
          this.logger.warn(`⚠️ Loaded persisted WhatsApp ban state: ${this.banReason}`);
        }
      }
    } catch (err: any) {
      this.logger.debug(`Could not load ban state from DB: ${err?.message}`);
    }
  }

  private async saveBanState() {
    try {
      await this.prisma.systemSetting.upsert({
        where: { key: 'WHATSAPP_BAN_STATE' },
        create: {
          key: 'WHATSAPP_BAN_STATE',
          value: {
            isBanned: true,
            banReason: this.banReason,
            bannedAt: this.bannedAt?.toISOString(),
          },
        },
        update: {
          value: {
            isBanned: true,
            banReason: this.banReason,
            bannedAt: this.bannedAt?.toISOString(),
          },
        },
      });
    } catch (err: any) {
      this.logger.warn(`Failed to persist ban state: ${err?.message}`);
    }
  }

  private async clearBanState() {
    try {
      await this.prisma.systemSetting.deleteMany({
        where: { key: 'WHATSAPP_BAN_STATE' },
      });
    } catch (err: any) {
      this.logger.debug(`Could not clear ban state from DB: ${err?.message}`);
    }
  }

  /**
   * Internal handler called whenever a ban is detected from Baileys socket error or send error.
   */
  async handleBanDetected(reason: string) {
    this.isBanned = true;
    this.banReason = reason;
    this.bannedAt = new Date();
    this.connectionStatus = 'banned';

    await this.saveBanState();
    await this.notifyTeachersOfBan();
  }

  /**
   * Dispatches an in-app system notification to all teachers and administrative staff.
   */
  private async notifyTeachersOfBan() {
    try {
      // Throttle alerts: only send if no ban alert was dispatched in the last 12 hours
      const recentAlert = await this.prisma.notification.findFirst({
        where: {
          type: 'WHATSAPP_BAN_ALERT',
          createdAt: { gte: new Date(Date.now() - 12 * 60 * 60 * 1000) },
        },
      });

      if (recentAlert) {
        this.logger.log('Ban alert notification already dispatched recently; skipping duplicate dispatch.');
        return;
      }

      const staffUsers = await this.prisma.user.findMany({
        where: {
          role: { in: [UserRole.TEACHER, UserRole.SECRETARIAT] },
          isActive: true,
        },
        select: { id: true, fullName: true, role: true },
      });

      if (!staffUsers.length) return;

      const title = '🚨 تنبيه عاجل: تم حظر رقم الواتساب المرتبط بالمنصة';
      const message =
        `نود إحاطتكم بأنه تم حظر رقم الواتساب (${this.connectedNumber || 'المرتبط بالمنصة'}) من قِبل شركة واتساب.\n\n` +
        `📌 سبب الحظر المحتمل: إرسال عدد كبير من الرسائل التلقائية في وقت متقارب لأرقام غير مسجلة في جهات اتصال الهاتف، أو قيام أحد المستلمين بالإبلاغ عن الرسائل (Spam).\n\n` +
        `⏳ مدة الحظر المتوقعة: يستمر الحظر المؤقت عادةً من 24 إلى 48 ساعة. في حالة الحظر الدائم، يلزم تقديم طلب مراجعة رسمي.\n\n` +
        `🛠️ الإجراء الموصى به:\n` +
        `1. فتح تطبيق واتساب على الهاتف والضغط على "طلب مراجعة" (Request a Review).\n` +
        `2. أو الدخول إلى "مركز التحكم في الإشعارات" وفك الارتباط وربط رقم هاتف جديد فوراً لضمان استمرار وصول الرسائل لأولياء الأمور.`;

      for (const staff of staffUsers) {
        await this.prisma.notification.create({
          data: {
            recipientId: staff.id,
            type: 'WHATSAPP_BAN_ALERT',
            notificationType: NotificationType.GENERAL_ANNOUNCEMENT,
            title,
            message,
            channels: [NotificationChannel.IN_APP],
            isRead: false,
            data: {
              isBanned: true,
              bannedAt: this.bannedAt?.toISOString(),
              reason: this.banReason,
            },
          },
        });
      }

      this.logger.log(`📢 Ban notifications sent to ${staffUsers.length} staff members.`);
    } catch (err) {
      this.logger.error('Failed to dispatch ban notifications to teachers', err);
    }
  }

  /**
   * Normalizes various Egyptian phone formats to a WhatsApp JID.
   * Handles: 01XXXXXXXXX, 201XXXXXXXXX, +201XXXXXXXXX
   */
  normalizePhoneToJid(phone: string): string {
    // Strip all non-digits
    let digits = phone.replace(/\D/g, '');

    // Egyptian numbers: strip leading 0 and prepend country code
    if (digits.startsWith('0') && digits.length === 11) {
      digits = '2' + digits; // 01X → 201X
    } else if (digits.startsWith('1') && digits.length === 10) {
      digits = '20' + digits; // 1X → 201X
    }

    return `${digits}@s.whatsapp.net`;
  }

  /** Returns a random integer between min and max (inclusive). */
  randomBetween(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /** Promise-based sleep. */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
