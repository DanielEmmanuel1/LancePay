import pino from 'pino';

export const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.NODE_ENV === 'development' ? {
        target: 'pino-pretty',
        options: {
            colorize: true,
        },
    } : undefined,
    base: {
        env: process.env.NODE_ENV,
        revision: process.env.VERCEL_GIT_COMMIT_SHA,
    },
});

export const logError = (error: Error, errorInfo?: { [key: string]: any }) => {
    logger.error({ err: error, ...errorInfo }, error.message);
=======
/**
 * Simple logging utility for error reporting.
 * In a production environment, this should be integrated with services like Sentry, LogRocket, or Datadog.
 */

export const logError = (error: Error, errorInfo?: { [key: string]: any }) => {
  // Always log to console in development
  if (process.env.NODE_ENV === "development") {
    console.group("🔴 Runtime Error Caught");
    console.error("Error:", error.message);
    if (errorInfo) {
      console.log("Context:", errorInfo);
    }
    console.log("Stack Trace:", error.stack);
    console.groupEnd();
  }

  // TODO: Implement production reporting service integration
  // Example: 
  // if (process.env.NODE_ENV === 'production') {
  //   Sentry.captureException(error, { extra: errorInfo });
  // }
};
