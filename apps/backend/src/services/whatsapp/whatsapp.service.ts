import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../core/database/prisma.service';
import { usePgAuthState } from './pg-auth';

type ConnectionStatus = 'connecting' | 'open' | 'close' | 'qr';

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
   * Returns the current connection status and QR code (base64 PNG) if available.
   * Used by the admin dashboard to display the pairing QR.
   */
  getStatus(): { connected: boolean; status: string; qr?: string } {
    return {
      connected: this.connectionStatus === 'open',
      status: this.connectionStatus,
      ...(this.qrCode ? { qr: this.qrCode } : {}),
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
  ): Promise<'sent' | 'not_registered' | 'not_connected' | 'error'> {
    if (this.connectionStatus !== 'open' || !this.socket) {
      this.logger.warn(
        `WhatsApp not connected (status=${this.connectionStatus}). Cannot send to ${phone}`,
      );
      return 'not_connected';
    }

    const jid = this.normalizePhoneToJid(phone);

    const sock = this.socket as {
      onWhatsApp: (jid: string) => Promise<Array<{ exists: boolean; jid: string }>>;
      presenceSubscribe: (jid: string) => Promise<void>;
      sendPresenceUpdate: (type: string, jid: string) => Promise<void>;
      sendMessage: (jid: string, content: unknown) => Promise<unknown>;
    };

    try {
      // ── Step 1: Verify number exists on WhatsApp ──────────────────────────
      const [result] = await sock.onWhatsApp(jid).catch(() => [{ exists: false, jid }]);
      if (!result?.exists) {
        this.logger.warn(
          `[AntiBan] Number ${phone} is NOT registered on WhatsApp — skipping`,
        );
        return 'not_registered';
      }

      // ── Step 2: Subscribe to presence (required before update) ───────────
      await sock.presenceSubscribe(jid).catch(() => undefined);

      // ── Step 3: Simulate typing presence ─────────────────────────────────
      await sock.sendPresenceUpdate('composing', jid).catch(() => undefined);

      // ── Step 4: Random typing duration (2.0s – 4.5s) ─────────────────────
      const typingDelay = this.randomBetween(2_000, 4_500);
      await this.sleep(typingDelay);

      // ── Step 5: Clear presence ────────────────────────────────────────────
      await sock.sendPresenceUpdate('paused', jid).catch(() => undefined);

      // ── Step 6: Send the message ──────────────────────────────────────────
      await sock.sendMessage(jid, { text });
      this.logger.log(
        `✅ [AntiBan] Protected message sent to ${jid} (typing delay: ${typingDelay}ms)`,
      );
      return 'sent';
    } catch (error) {
      this.logger.error(`❌ Failed to send protected WhatsApp message to ${phone}`, error);
      return 'error';
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

      // ── Event: connection state changes ──
      sock.ev.on('connection.update', async (update: unknown) => {
        const { connection, lastDisconnect, qr } = update as {
          connection?: string;
          lastDisconnect?: { error?: { output?: { statusCode?: number } } };
          qr?: string;
        };

        if (qr) {
          this.connectionStatus = 'qr';
          // Convert QR string to a base64 PNG data URL
          try {
            const QRCode = await import('qrcode');
            this.qrCode = await QRCode.default.toDataURL(qr);
            this.logger.log('📱 New WhatsApp QR code generated. Scan to pair.');
          } catch {
            this.qrCode = qr; // fallback: raw QR string
          }
        }

        if (connection === 'open') {
          this.connectionStatus = 'open';
          this.qrCode = null;
          this.logger.log('✅ WhatsApp connected and ready');
        }

        if (connection === 'close') {
          this.connectionStatus = 'close';
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
