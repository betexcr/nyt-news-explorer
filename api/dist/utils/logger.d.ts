import pino from 'pino';
/**
 * Structured logger with OpenTelemetry integration
 * - Correlation ID support
 * - JSON structured logging for production
 * - Pretty printing for development
 * - PII protection
 * - Performance optimized
 */
export declare const logger: pino.Logger<never, boolean>;
/**
 * Create a child logger with correlation ID
 */
export declare function createCorrelatedLogger(correlationId: string): pino.Logger<never, boolean>;
/**
 * Create a child logger for specific module/component
 */
export declare function createModuleLogger(module: string): pino.Logger<never, boolean>;
/**
 * Performance timer utility
 */
export declare function createTimer(logger: pino.Logger): (message: string, meta?: object) => void;
/**
 * Audit logger for security events
 */
export declare const auditLogger: pino.Logger<never, boolean>;
/**
 * Performance logger for monitoring
 */
export declare const performanceLogger: pino.Logger<never, boolean>;
/**
 * Business logic logger
 */
export declare const businessLogger: pino.Logger<never, boolean>;
