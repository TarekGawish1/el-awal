import { PrismaService } from '../../core/database/prisma.service';

/**
 * Baileys uses BufferJSON to handle Buffer serialization to/from JSON.
 * We import it dynamically because @whiskeysockets/baileys is an ESM package.
 */

type BaileysAuthState = {
  creds: Record<string, unknown>;
  keys: {
    get: (type: string, ids: string[]) => Promise<Record<string, unknown>>;
    set: (data: Record<string, Record<string, unknown>>) => Promise<void>;
  };
};

/**
 * Creates a PostgreSQL-backed Baileys authentication state adapter.
 * This replaces the default file-system auth store, solving Heroku's
 * ephemeral filesystem issue — session persists across dyno restarts.
 *
 * @param prisma - Injected PrismaService instance
 * @returns { state, saveCreds } compatible with makeWASocket()
 */
export async function usePgAuthState(
  prisma: PrismaService,
): Promise<{ state: BaileysAuthState; saveCreds: () => Promise<void> }> {
  // Dynamically import Baileys ESM modules
  const { proto, initAuthCreds, BufferJSON } = await import(
    '@whiskeysockets/baileys'
  );

  /**
   * Writes a record to the WhatsAppAuthSession table.
   * All values are JSON-serialized using BufferJSON to correctly handle Buffer objects.
   */
  const writeData = async (id: string, value: unknown): Promise<void> => {
    await prisma.whatsAppAuthSession.upsert({
      where: { id },
      create: { id, value: JSON.parse(JSON.stringify(value, BufferJSON.replacer)) },
      update: { value: JSON.parse(JSON.stringify(value, BufferJSON.replacer)) },
    });
  };

  /**
   * Reads and deserializes a record from WhatsAppAuthSession.
   * Returns null if not found.
   */
  const readData = async (id: string): Promise<unknown | null> => {
    const record = await prisma.whatsAppAuthSession.findUnique({ where: { id } });
    if (!record) return null;
    return JSON.parse(JSON.stringify(record.value), BufferJSON.reviver);
  };

  /**
   * Deletes a key from the auth session store.
   */
  const removeData = async (id: string): Promise<void> => {
    await prisma.whatsAppAuthSession
      .delete({ where: { id } })
      .catch(() => undefined); // ignore if not found
  };

  // Load or initialize credentials
  const creds = ((await readData('creds')) as Record<string, unknown>) || initAuthCreds();

  return {
    state: {
      creds,
      keys: {
        /**
         * Batch-fetches signal keys (pre-keys, session records, etc.)
         * Key IDs are namespaced as "{type}-{id}"
         */
        get: async (type: string, ids: string[]) => {
          const data: Record<string, unknown> = {};
          await Promise.all(
            ids.map(async (id) => {
              const keyId = `${type}-${id}`;
              let value = await readData(keyId);
              if (type === 'app-state-sync-key' && value) {
                value = proto.Message.AppStateSyncKeyData.fromObject(value);
              }
              data[id] = value;
            }),
          );
          return data;
        },

        /**
         * Batch-upserts signal keys received from Baileys.
         * Handles Buffer serialization transparently via BufferJSON.
         */
        set: async (data: Record<string, Record<string, unknown>>) => {
          const tasks: Promise<void>[] = [];
          for (const [type, ids] of Object.entries(data)) {
            for (const [id, value] of Object.entries(ids)) {
              const keyId = `${type}-${id}`;
              tasks.push(value ? writeData(keyId, value) : removeData(keyId));
            }
          }
          await Promise.all(tasks);
        },
      },
    },

    /**
     * Persists credentials — must be called inside socket's creds.update event.
     */
    saveCreds: async () => {
      await writeData('creds', creds);
    },
  };
}
