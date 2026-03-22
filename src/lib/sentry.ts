import * as Sentry from '@sentry/react';

/**
 * Sentry configuration for error tracking and performance monitoring
 * 
 * To set up Sentry:
 * 1. Create a Sentry project at https://sentry.io
 * 2. Get your DSN from project settings
 * 3. Add VITE_SENTRY_DSN to your .env file
 * 4. Set environment variables in Vercel/S交代
 */

export const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
export const SENTRY_ENVIRONMENT = import.meta.env.MODE || 'development';
export const SENTRY_RELEASE = import.meta.env.VITE_APP_VERSION || '1.0.0';

/**
 * Initialize Sentry with React error tracking
 * Only initializes if DSN is present to allow development without Sentry
 */
export function initSentry() {
    if (!SENTRY_DSN) {
        console.warn('Sentry DSN not configured. Error tracking disabled.');
        return;
    }

    Sentry.init({
        dsn: SENTRY_DSN,
        environment: SENTRY_ENVIRONMENT,
        release: SENTRY_RELEASE,

        // Enable error tracking
        integrations: [
            Sentry.replayIntegration({
                maskAllText: true,
                blockAllMedia: true,
            }),
            Sentry.browserTracingIntegration(),
        ],

        // Performance monitoring
        tracesSampleRate: SENTRY_ENVIRONMENT === 'production' ? 0.1 : 1.0,

        // Session replay
        replaysSessionSampleRate: 0.1,
        replaysOnErrorSampleRate: 1.0,

        // Filter out common non-actionable errors
        beforeSend(event, hint) {
            const error = hint.originalException;

            // Ignore network errors that are handled by the app
            if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
                return null;
            }

            // Ignore abort errors
            if (error instanceof DOMException && error.name === 'AbortError') {
                return null;
            }

            return event;
        },
    });

    console.log('Sentry initialized:', { environment: SENTRY_ENVIRONMENT, release: SENTRY_RELEASE });
}

/**
 * Wrap your component with Sentry's ErrorBoundary
 * Use this for critical sections that shouldn't crash the entire app
 */
export const SentryErrorBoundary = Sentry.ErrorBoundary;

/**
 * Track a custom event in Sentry
 */
export function trackEvent(name: string, data?: Record<string, unknown>) {
    if (!SENTRY_DSN) return;

    Sentry.captureMessage(name, {
        level: 'info',
        extra: data,
    });
}

/**
 * Track an error with additional context
 */
export function trackError(error: Error, context?: Record<string, unknown>) {
    if (!SENTRY_DSN) {
        console.error('Error (Sentry not configured):', error, context);
        return;
    }

    Sentry.captureException(error, {
        extra: context,
    });
}

/**
 * Add user context for error tracking
 */
export function setUserContext(user: { id: string; email?: string; username?: string } | null) {
    if (!SENTRY_DSN) return;

    if (user) {
        Sentry.setUser({
            id: user.id,
            email: user.email,
            username: user.username,
        });
    } else {
        Sentry.setUser(null);
    }
}
