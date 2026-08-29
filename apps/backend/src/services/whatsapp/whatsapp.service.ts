import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../core/database/prisma.service';
import { WhatsAppStatus } from '@prisma/client';
import { usePgAuthState } from './pg-auth';
import * as QRCode from 'qrcode';

type ConnectionStatus = 'connecting' | 'open' | 'close' | 'qr';

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
    if (enabled === 'false') {
      this.logger.warn('WhatsApp integration is DISABLED (WHATSAPP_ENABLED=false)');
      return;
    }
    await this.initSocket();
  }

  onModuleDestroy() {
    this.isDestroyed = true;
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.closeSocket();
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  /**
   * Returns the current connection status, connected number, and QR code (base64 PNG) if available.
   * Used by the admin dashboard to display the pairing QR and status.
   */
  getStatus(): { connected: boolean; status: string; qr?: string | null; connectedNumber?: string | null } {
    return {
      connected: this.connectionStatus === 'open',
      status: this.connectionStatus,
      qr: this.qrCode,
      connectedNumber: this.connectedNumber,
    };
  }

  /**
   * Disconnects existing WhatsApp session, clears PostgreSQL auth credentials,
   * and reinitializes socket to immediately generate a fresh QR code for pairing a new number.
   */
  async resetSession(): Promise<{ success: boolean; message: string }> {
    this.logger.warn('🔄 Manually resetting WhatsApp session & clearing credentials for new number pairing...');
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.closeSocket();
    await this.clearAuthSession();

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
      onWhatsApp: (jid: string) => Promise<Array<{ exists: boolean; jid: string }>>;
      presenceSubscribe: (jid: string) => Promise<void>;
      sendPresenceUpdate: (type: string, jid: string) => Promise<void>;
      sendMessage: (jid: string, content: unknown) => Promise<unknown>;
    };

    try {
      const [result] = await sock.onWhatsApp(jid).catch(() => [{ exists: false, jid }]);
      if (!result?.exists) {
        this.logger.warn(`[AntiBan] Number ${phone} is NOT registered on WhatsApp — skipping`);
        return { outcome: 'not_registered' };
      }

      await sock.presenceSubscribe(jid).catch(() => undefined);
      await sock.sendPresenceUpdate('composing', jid).catch(() => undefined);

      const typingDelay = this.randomBetween(2_000, 4_500);
      await this.sleep(typingDelay);
      await sock.sendPresenceUpdate('paused', jid).catch(() => undefined);

      const response = await sock.sendMessage(jid, { text });
      const providerMessageId = (response as { key?: { id?: string } } | undefined)?.key?.id;
      this.logger.log(
        `✅ [AntiBan] Protected message sent to ${jid} (typing delay: ${typingDelay}ms)`,
      );
      return { outcome: 'sent', providerMessageId };
    } catch (error) {
      const failureReason = error instanceof Error ? error.message : 'Unknown WhatsApp gateway error';
      this.logger.error(`❌ Failed to send protected WhatsApp message to ${phone}`, error);
      return { outcome: 'error', failureReason };
    }
  }

  // ─── Internal Helpers ───────────────────────────────────────────────────────

  private async initSocket() {
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
          lastDisconnect?: { error?: { output?: { statusCode?: number } } };
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
          const user = (sock as any)?.user;
          this.connectedNumber = user?.id ? user.id.split(':')[0].replace(/[^0-9]/g, '') : 'Active';
          this.logger.log(`✅ WhatsApp connected and ready (Number: ${this.connectedNumber})`);
        }

        if (connection === 'close') {
          this.connectionStatus = 'close';
          this.connectedNumber = null;
          const statusCode = lastDisconnect?.error?.output?.statusCode;
          const { DisconnectReason: DR } = this.baileys as { DisconnectReason: Record<string, unknown> };
          const isLoggedOut = statusCode === (DR.loggedOut as number);

          if (isLoggedOut) {
            this.logger.warn('🔐 WhatsApp session logged out. Clearing PG auth and restarting...');
            await this.clearAuthSession();
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
      if (!this.isDestroyed) {
        this.reconnectTimeout = setTimeout(() => this.initSocket(), 10_000);
      }
    }
  }

  private closeSocket() {
    try {
      const sock = this.socket as { ev?: { removeAllListeners: () => void } } | null;
      if (sock?.ev) {
        sock.ev.removeAllListeners();
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
