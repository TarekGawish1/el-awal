import { Injectable, LoggerService, LogLevel } from '@nestjs/common';

@Injectable()
export class AppLogger implements LoggerService {
  private readonly isProduction: boolean;
  private readonly isCloudOrHeroku: boolean;
  private readonly useColors: boolean;

  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.isCloudOrHeroku = Boolean(
      process.env.DYNO ||
      process.env.HEROKU ||
      process.env.HEROKU_APP_ID ||
      process.env.AWS_EXECUTION_ENV ||
      process.env.K_SERVICE,
    );

    // Disable colors if NO_COLOR is set, if running in cloud log aggregator (like Heroku), or if stdout is not a TTY in production
    this.useColors =
      process.env.NO_COLOR !== 'true' &&
      !this.isCloudOrHeroku &&
      (!this.isProduction || Boolean(process.stdout.isTTY));
  }

  private colorize(text: string, colorCode: string): string {
    if (!this.useColors) return text;
    return `\x1b[${colorCode}m${text}\x1b[0m`;
  }

  private formatTimestamp(): string {
    if (this.isCloudOrHeroku || this.isProduction) {
      // Cloud log aggregators (Heroku, CloudWatch, GCP) already append ISO timestamps
      return '';
    }
    const now = new Date();
    const time = now.toTimeString().split(' ')[0];
    return `[${time}] `;
  }

  private formatMessage(
    level: LogLevel,
    message: any,
    context?: string,
  ): string {
    const ts = this.formatTimestamp();
    const ctx = context ? `[${context}] ` : '';

    let badge: string;
    switch (level) {
      case 'error':
      case 'fatal':
        badge = this.colorize('[ERROR]', '1;31'); // Bold Red
        break;
      case 'warn':
        badge = this.colorize('[WARN] ', '1;33'); // Bold Yellow
        break;
      case 'debug':
        badge = this.colorize('[DEBUG]', '1;35'); // Magenta
        break;
      case 'verbose':
        badge = this.colorize('[VERB] ', '1;36'); // Cyan
        break;
      case 'log':
      default:
        badge = this.colorize('[INFO] ', '1;32'); // Green
        break;
    }

    const coloredContext = context
      ? this.colorize(ctx, '1;34') // Bold Blue
      : '';

    const formattedMessage =
      typeof message === 'object'
        ? JSON.stringify(message, null, 2)
        : String(message);

    return `${ts}${badge} ${coloredContext}${formattedMessage}`;
  }

  log(message: any, context?: string): void {
    const formatted = this.formatMessage('log', message, context);
    console.log(formatted);
  }

  error(message: any, trace?: string, context?: string): void {
    const formatted = this.formatMessage('error', message, context);
    console.error(formatted);
    if (trace) {
      console.error(this.colorize(trace, '31'));
    }
  }

  warn(message: any, context?: string): void {
    const formatted = this.formatMessage('warn', message, context);
    console.warn(formatted);
  }

  debug(message: any, context?: string): void {
    const formatted = this.formatMessage('debug', message, context);
    console.debug(formatted);
  }

  verbose(message: any, context?: string): void {
    const formatted = this.formatMessage('verbose', message, context);
    console.log(formatted);
  }

  fatal(message: any, trace?: string, context?: string): void {
    this.error(message, trace, context);
  }
}
