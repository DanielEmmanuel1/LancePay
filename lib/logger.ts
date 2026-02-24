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
};
