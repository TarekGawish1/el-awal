import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../core/database/prisma.service';
import { WhatsAppStatus } from '@prisma/client';
import { usePgAuthState } from './pg-auth';
import * as QRCode from 'qrcode';
import { WhatsAppBanService } from './whatsapp-ban.service';
import { normalizePhoneToJid, randomBetween, sleep } from './whatsapp-sender.helper';

export type ConnectionStatus = 'connecting' | 'open' | 'close' | 'qr' | 'banned';

export type ProtectedSendOutcome = 'sent' | 'not_registered' | 'not_connected' | 'error';

export interface ProtectedSendResult {
  outcome: ProtectedSendOutcome;
  providerMessageId?: string;
  failureReason?: string;
}

/**
 * WhatsAppService — manages the Baileys WA socket lifecycle with anti-ban hardening.
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

  // Ban tracking
  private isBanned = false;
  private banReason: string | null = null;
  private bannedAt: Date | null = null;

  private readonly banService: WhatsAppBanService;

  // Baileys ESM dynamic import cache
  private baileys: {
    makeWASocket: (opts: unknown) => unknown;
    DisconnectReason: Record<string, unknown>;
    fetchLatestBaileysVersion: () => Promise<{ version: [number, number, number] }>;
    makeCacheableSignalKeyStore: (keys: unknown, logger: unknown) => unknown;
    delay: (ms: number) => Promise<void>;
  } | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Optional() banService?: WhatsAppBanService,
  ) {
    this.banService = banService ?? new WhatsAppBanService(prisma);
  }

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
    const persisted = await this.banService.loadBanState();
    if (persisted.isBanned) {
      this.isBanned = true;
      this.banReason = persisted.banReason;
      this.bannedAt = persisted.bannedAt;
      this.connectionStatus = 'banned';
    }
    await this.initSocket();
  }

  onModuleDestroy() {
    this.isDestroyed = true;
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.closeSocket();
  }

  // ─── Public API ────────────────────────────────────────────────────────────

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

  async resetSession(): Promise<{ success: boolean; message: string }> {
    this.logger.warn('🔄 Manually resetting WhatsApp session & clearing credentials for new number pairing...');
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.closeSocket();
    await this.clearAuthSession();
    await this.banService.clearBanState();

    this.isBanned = false;
    this.banReason = null;
    this.bannedAt = null;
    this.connectionStatus = 'connecting';
    this.qrCode = null;
    this.connectedNumber = null;

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

  async sendTextMessage(phone: string, text: string): Promise<boolean> {
    return this.sendMessage(phone, text);
  }

  async sendProtectedMessage(phone: string, text: string): Promise<ProtectedSendOutcome> {
    return (await this.sendTrackedProtectedMessage(phone, text)).outcome;
  }

  async sendTrackedProtectedMessage(phone: string, text: string): Promise<ProtectedSendResult> {
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

      const lower = failureReason.toLowerCase();
      if (lower.includes('banned') || lower.includes('403') || lower.includes('blocked')) {
        void this.handleBanDetected(`فشل إرسال الرسالة بسبب حظر الرقم: ${failureReason}`);
      }

      return { outcome: 'error', failureReason };
    }
  }

  // ─── Internal Socket Lifecycle ─────────────────────────────────────────────

  private async initSocket() {
    this.closeSocket();
    try {
      if (!this.baileys) {
        this.baileys = (await import('@whiskeysockets/baileys')) as unknown as typeof this.baileys;
      }

      const { makeWASocket, fetchLatestBaileysVersion, makeCacheableSignalKeyStore } = this.baileys!;
      const { version } = await fetchLatestBaileysVersion();
      this.logger.log(`Baileys version: ${version.join('.')}`);

      const { state, saveCreds } = await usePgAuthState(this.prisma);
      const P = await import('pino');
      const baileysLogger = P.default({ level: 'silent' });

      const sock = makeWASocket({
        version,
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, baileysLogger),
        },
        printQRInTerminal: false,
        logger: baileysLogger,
        browser: ['El-Awal Platform', 'Chrome', '120.0.0'],
        generateHighQualityLinkPreview: false,
        connectTimeoutMs: 60_000,
        keepAliveIntervalMs: 10_000,
      }) as any;

      this.socket = sock;

      sock.ev.on('creds.update', saveCreds);

      sock.ev.on('messages.update', (updates: unknown) => {
        void this.recordDeliveryReceipts(updates);
      });

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
          await this.banService.clearBanState();

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
            return;
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
      const sock = this.socket as any;
      if (sock?.ev) sock.ev.removeAllListeners();
      if (sock?.ws && typeof sock.ws.removeAllListeners === 'function') sock.ws.removeAllListeners();
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

    const messageIdsToUpdate: string[] = [];
    for (const entry of updates) {
      const receipt = entry as { key?: { id?: string; fromMe?: boolean }; update?: { status?: number } };
      const messageId = receipt.key?.id;
      if (receipt.key?.fromMe && messageId && (receipt.update?.status ?? 0) >= 3) {
        messageIdsToUpdate.push(messageId);
      }
    }

    if (messageIdsToUpdate.length > 0) {
      try {
        await this.prisma.whatsAppMessageLog.updateMany({
          where: {
            providerMessageId: { in: messageIdsToUpdate },
            status: WhatsAppStatus.SENT,
          },
          data: { status: WhatsAppStatus.DELIVERED, deliveredAt: new Date() },
        });
      } catch (error) {
        this.logger.warn(`Failed to record WhatsApp delivery receipts batch`, error);
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

  async handleBanDetected(reason: string) {
    this.isBanned = true;
    this.banReason = reason;
    this.bannedAt = new Date();
    this.connectionStatus = 'banned';

    await this.banService.saveBanState(this.banReason, this.bannedAt);
    await this.banService.notifyTeachersOfBan(this.connectedNumber, this.banReason, this.bannedAt);
  }

  // --- Helper wrappers ---
  normalizePhoneToJid(phone: string): string {
    return normalizePhoneToJid(phone);
  }

  randomBetween(min: number, max: number): number {
    return randomBetween(min, max);
  }

  private sleep(ms: number): Promise<void> {
    return sleep(ms);
  }
}
