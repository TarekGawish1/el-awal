'use client';

import { io, Socket } from 'socket.io-client';
import { getStoredAccessToken } from '@/features/auth/utils/auth-tokens';
import { API_BASE_URL } from '@/lib/api/endpoints';

// Socket.IO connects to the same HTTP origin as the REST API, on the default
// `/socket.io` path (the global `/api/v1` prefix only applies to REST routes).
const SOCKET_URL = API_BASE_URL.replace(/\/api\/v1\/?$/, '');

let socket: Socket | null = null;

/**
 * Returns the shared realtime socket for the current session, lazily connecting
 * with the stored access token for handshake authentication. Disconnected on
 * logout via {@link disconnectRealtimeSocket}.
 */
export function getRealtimeSocket(): Socket | null {
  if (typeof window === 'undefined') return null;
  if (socket) return socket;

  const token = getStoredAccessToken();
  if (!token) return null;

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  return socket;
}

/** Disconnects and clears the shared realtime socket (e.g. on logout). */
export function disconnectRealtimeSocket(): void {
  socket?.disconnect();
  socket = null;
}
