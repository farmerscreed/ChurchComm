import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { trackError } from '@/lib/sentry';
import { useState } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

/**
 * Error Boundary component that catches React errors and prevents app crashes
 * Integrates with Sentry for error tracking
 * 
 * Usage:
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        // Track error in Sentry
        trackError(error, {
            componentStack: errorInfo.componentStack,
            errorBoundary: true,
        });

        // Call custom error handler if provided
        this.props.onError?.(error, errorInfo);

        console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    handleReset = (): void => {
        this.setState({ hasError: false, error: null });
    };

    handleReload = (): void => {
        window.location.reload();
    };

    render(): ReactNode {
        if (this.state.hasError) {
            // Custom fallback UI
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // Default error UI
            return (
                <div className="flex items-center justify-center min-h-[400px] p-4">
                    <Card className="w-full max-w-md">
                        <CardHeader className="text-center">
                            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
                                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                            </div>
                            <CardTitle>Something went wrong</CardTitle>
                            <CardDescription>
                                We encountered an unexpected error. Please try again or contact support if the problem persists.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-2">
                            {this.state.error && (
                                <div className="mb-4 rounded-md bg-red-50 dark:bg-red-900/10 p-3 text-sm text-red-600 dark:text-red-400">
                                    <p className="font-medium">Error:</p>
                                    <p className="mt-1 break-words">{this.state.error.message}</p>
                                </div>
                            )}
                            <div className="flex gap-2">
                                <Button
                                    onClick={this.handleReset}
                                    variant="outline"
                                    className="flex-1"
                                >
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    Try Again
                                </Button>
                                <Button
                                    onClick={this.handleReload}
                                    className="flex-1"
                                >
                                    <Home className="mr-2 h-4 w-4" />
                                    Reload Page
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            );
        }

        return this.props.children;
    }
}

/**
 * Hook for functional components to handle errors
 * Use this inside components to set error state in an ErrorBoundary parent
 */
export function useErrorHandler() {
    const [error, setError] = useState<Error | null>(null);

    const handleError = (err: Error | string) => {
        const error = typeof err === 'string' ? new Error(err) : err;
        setError(error);
        trackError(error, { useErrorHandler: true });
    };

    const clearError = () => setError(null);

    return { error, handleError, clearError };
}
