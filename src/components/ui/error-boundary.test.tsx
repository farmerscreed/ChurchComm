import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorBoundary } from './error-boundary';
import { useState } from 'react';

// Helper component that throws an error
function ThrowError({ shouldThrow = true }: { shouldThrow?: boolean }) {
    if (shouldThrow) {
        throw new Error('Test error');
    }
    return <div data-testid="content">Normal content</div>;
}

describe('ErrorBoundary', () => {
    it('should render children when there is no error', () => {
        const { getByText } = render(
            <ErrorBoundary>
                <div>Test content</div>
            </ErrorBoundary>
        );

        expect(getByText('Test content')).toBeInTheDocument();
    });

    it('should catch errors and show fallback UI', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

        const { getByText } = render(
            <ErrorBoundary>
                <ThrowError shouldThrow={true} />
            </ErrorBoundary>
        );

        // Wait for error to be caught
        await new Promise(resolve => setTimeout(resolve, 100));

        expect(getByText('Something went wrong')).toBeInTheDocument();
        expect(getByText('Test error')).toBeInTheDocument();

        consoleSpy.mockRestore();
    });

    it('should have reload button', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        const reloadSpy = vi.spyOn(window.location, 'reload').mockImplementation(() => { });

        const { getByText } = render(
            <ErrorBoundary>
                <ThrowError shouldThrow={true} />
            </ErrorBoundary>
        );

        await new Promise(resolve => setTimeout(resolve, 100));

        // Click reload button
        await userEvent.click(getByText('Reload Page'));

        expect(reloadSpy).toHaveBeenCalled();

        consoleSpy.mockRestore();
        reloadSpy.mockRestore();
    });

    it('should call onError callback when error occurs', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        const onError = vi.fn();

        const { getByText } = render(
            <ErrorBoundary onError={onError}>
                <ThrowError shouldThrow={true} />
            </ErrorBoundary>
        );

        await new Promise(resolve => setTimeout(resolve, 100));

        expect(onError).toHaveBeenCalled();

        consoleSpy.mockRestore();
    });
});