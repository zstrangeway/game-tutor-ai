import {
  Injectable,
  LoggerService as NestLoggerService,
  LogLevel,
} from '@nestjs/common';

@Injectable()
export class LoggerService implements NestLoggerService {
  private context: string;

  constructor() {
    this.context = 'AppLogger';
  }

  setContext(context: string) {
    this.context = context;
  }

  log(message: any, context?: string) {
    this.printLog('log', message, context || this.context);
  }

  error(message: any, trace?: string, context?: string) {
    this.printLog('error', message, context || this.context, trace);

    // Here you would integrate with error tracking service like Sentry
    // For example: Sentry.captureException(message);
  }

  warn(message: any, context?: string) {
    this.printLog('warn', message, context || this.context);
  }

  debug(message: any, context?: string) {
    this.printLog('debug', message, context || this.context);
  }

  verbose(message: any, context?: string) {
    this.printLog('verbose', message, context || this.context);
  }

  private printLog(
    level: LogLevel,
    message: any,
    context: string,
    trace?: string,
  ) {
    const now = new Date();
    const timestamp = `${now.toISOString()}`;
    const formattedMessage = `[${timestamp}] [${level.toUpperCase()}] [${context}] ${message}`;

    switch (level) {
      case 'error':
        console.error(formattedMessage);
        if (trace) {
          console.error(trace);
        }
        break;
      case 'warn':
        console.warn(formattedMessage);
        break;
      case 'debug':
        console.debug(formattedMessage);
        break;
      case 'verbose':
        console.debug(formattedMessage);
        break;
      default:
        console.log(formattedMessage);
    }
  }
}
