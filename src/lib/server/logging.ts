import winston from 'winston';
import { LoggingWinston } from '@google-cloud/logging-winston';

const { combine, timestamp, json, errors, simple, colorize } = winston.format;

// Standard Google Cloud Logging severity levels
export type LogSeverity =
	| 'DEFAULT'
	| 'DEBUG'
	| 'INFO'
	| 'NOTICE'
	| 'WARNING'
	| 'ERROR'
	| 'CRITICAL'
	| 'ALERT'
	| 'EMERGENCY';

// Configure transport based on environment
const transports: winston.transport[] = [];

// Check for production environment or Cloud Run specifically (K_SERVICE is set automatically in Cloud Run)
if (process.env.NODE_ENV === 'production' || process.env.K_SERVICE) {
	// In production (Cloud Run), use LoggingWinston which handles structured JSON and severity correctly
	// redirectToStdout: true ensures logs are written to stdout/stderr which Cloud Run captures automatically
	transports.push(
		new LoggingWinston({
			redirectToStdout: true,
			useMessageField: false, // Avoid duplicate message field if not needed, verify defaults
		}),
	);
} else {
	// In development, use Console with simple formatting for readability
	transports.push(
		new winston.transports.Console({
			format: combine(colorize(), simple(), errors({ stack: true })),
		}),
	);
}

// Add Cloud Logging transport if in production or configured
// (Optional: Only add if GOOGLE_APPLICATION_CREDENTIALS or specific env var is present)
// For Cloud Run, stdout JSON is usually enough, but the dedicated transport adds trace correlation etc.
if (process.env.NODE_ENV === 'production') {
	transports.push(new LoggingWinston());
}

// Create the base logger instance
const baseLogger = winston.createLogger({
	level: process.env.LOG_LEVEL || 'info',
	transports,
	defaultMeta: { service: 'fujino-cloud-app' }, // Default metadata for all logs
});

export class Logger {
	private logger: winston.Logger;

	constructor(context: Record<string, any> = {}) {
		// Create a child logger with specific context for this request/module
		this.logger = baseLogger.child(context);
	}

	debug(message: string, meta?: Record<string, any>) {
		this.logger.debug(message, meta);
	}

	info(message: string, meta?: Record<string, any>) {
		this.logger.info(message, meta);
	}

	notice(message: string, meta?: Record<string, any>) {
		// Winston doesn't have 'notice' by default, mapping to 'info' or custom level
		// Google Cloud recognizes 'NOTICE'. We can use 'warn' or 'info' with severity field if needed.
		// For simplicity, let's stick to info with severity metadata if strictly needed,
		// or just use info. 'notice' is often used for significant but normal events.
		this.logger.info(message, { ...meta, severity: 'NOTICE' });
	}

	warn(message: string, meta?: Record<string, any>) {
		this.logger.warn(message, meta);
	}

	error(message: string, meta?: Record<string, any>) {
		this.logger.error(message, meta);
	}

	critical(message: string, meta?: Record<string, any>) {
		this.logger.error(message, { ...meta, severity: 'CRITICAL' });
	}
}
