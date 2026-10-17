import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getMessaging, Messaging } from 'firebase-admin/messaging';
import * as fs from 'fs';
import * as path from 'path';

export interface FirebaseAdminInitResult {
  app?: App;
  messaging?: Messaging;
}

/**
 * Initializes Firebase Admin SDK with Service Account credentials from env or JSON files.
 */
export function initFirebaseAdmin(
  config: ConfigService,
  logger: Logger,
): FirebaseAdminInitResult {
  try {
    if (getApps().length > 0) {
      const app = getApps()[0];
      const messaging = getMessaging(app);
      logger.log('🔥 Firebase Cloud Messaging connected (existing app)');
      return { app, messaging };
    }

    let credentialObj: any = null;

    // 1. From environment variable FIREBASE_SERVICE_ACCOUNT_KEY
    const rawKey = config.get<string>('FIREBASE_SERVICE_ACCOUNT_KEY');
    if (rawKey) {
      try {
        credentialObj = typeof rawKey === 'string' ? JSON.parse(rawKey) : rawKey;
      } catch {
        logger.warn('Could not parse FIREBASE_SERVICE_ACCOUNT_KEY JSON string');
      }
    }

    // 2. From file system fallback (root workspace)
    if (!credentialObj) {
      const candidatePaths = [
        path.resolve(process.cwd(), 'al-awal-78dae-firebase-adminsdk-fbsvc-cebe73f540.json'),
        path.resolve(process.cwd(), '..', '..', 'al-awal-78dae-firebase-adminsdk-fbsvc-cebe73f540.json'),
        path.resolve(__dirname, '..', '..', '..', 'al-awal-78dae-firebase-adminsdk-fbsvc-cebe73f540.json'),
      ];
      for (const p of candidatePaths) {
        if (fs.existsSync(p)) {
          try {
            credentialObj = JSON.parse(fs.readFileSync(p, 'utf8'));
            break;
          } catch {
            // ignore and try next
          }
        }
      }
    }

    if (credentialObj) {
      const projectId =
        credentialObj.project_id ||
        config.get<string>('FIREBASE_PROJECT_ID', 'al-awal-78dae');

      const app = initializeApp({
        credential: cert(credentialObj),
        projectId,
      });
      const messaging = getMessaging(app);
      logger.log(`🔥 Firebase Cloud Messaging (FCM) Admin SDK initialized for [${projectId}]`);
      return { app, messaging };
    } else {
      logger.warn('⚠️ No Firebase service account credentials found. FCM disabled.');
      return {};
    }
  } catch (err: any) {
    logger.warn(`Firebase Admin initialization note: ${err.message}`);
    return {};
  }
}
