import {
  Logger,
} from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

/**
 * RealtimeGateway — Socket.IO gateway for live server-push events.
 *
 * Each authenticated client joins a private room named `user:{userId}`.
 * Domain services can call `notifyReservationsChanged(userIds)` to push a
 * lightweight "data changed" signal so clients invalidate and refetch their
 * pending reservations (list + sidebar counter) instantly — no polling.
 */
@WebSocketGateway({
  cors: { origin: true, credentials: true },
  transport: ['websocket', 'polling'],
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Authenticates the client via the access JWT supplied in the handshake
   * (`auth.token` or `?token=`) and joins its private user room.
   * Disconnects the socket when authentication fails.
   */
  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string) ||
        (client.handshake.query?.token as string);

      if (!token) {
        throw new Error('No access token provided');
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });

      if (!payload?.sub) {
        throw new Error('Invalid token payload');
      }

      client.data.userId = payload.sub;
      await client.join(`user:${payload.sub}`);
      this.logger.log(`Socket connected for user [${payload.sub}]`);
    } catch (err: any) {
      this.logger.warn(`Socket connection rejected: ${err?.message || err}`);
      client.emit('realtime:unauthenticated');
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data?.userId;
    if (userId) {
      this.logger.log(`Socket disconnected for user [${userId}]`);
    }
  }

  /**
   * Broadcasts a lightweight "changed" signal to the given users' private rooms.
   * Clients listening on `reservations:changed` should invalidate their
   * `pending-reservations` query to re-fetch the latest list & counter.
   */
  notifyReservationsChanged(userIds: (string | undefined)[]) {
    if (!this.server) return;

    const payload = { updatedAt: new Date().toISOString() };
    const seen = new Set<string>();

    for (const userId of userIds) {
      if (!userId || seen.has(userId)) continue;
      seen.add(userId);
      this.server.to(`user:${userId}`).emit('reservations:changed', payload);
      this.logger.debug(`Emitted 'reservations:changed' to user [${userId}]`);
    }
  }

  /**
   * Broadcasts a lightweight "changed" signal to the given users' private rooms.
   * Clients listening on `inquiries:changed` should invalidate their
   * `contact-messages` and `contact-messages-unread-count` queries to re-fetch.
   */
  notifyInquiriesChanged(userIds: (string | undefined)[]) {
    if (!this.server) return;

    const payload = { updatedAt: new Date().toISOString() };
    const seen = new Set<string>();

    for (const userId of userIds) {
      if (!userId || seen.has(userId)) continue;
      seen.add(userId);
      this.server.to(`user:${userId}`).emit('inquiries:changed', payload);
      this.logger.debug(`Emitted 'inquiries:changed' to user [${userId}]`);
    }
  }
}
