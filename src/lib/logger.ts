/**
 * Simple logging utility that can be enabled/disabled
 * Useful for debugging without cluttering production code
 */

const isDevelopment = import.meta.env.DEV;
const isDebugEnabled = import.meta.env.VITE_DEBUG === 'true';

export const logger = {
  /**
   * Log debug information (only in development or when debug is enabled)
   */
  debug: (...args: unknown[]) => {
    if (isDevelopment || isDebugEnabled) {
      console.info('[DEBUG]', ...args);
    }
  },

  /**
   * Log informational messages
   */
  info: (...args: unknown[]) => {
    if (isDevelopment || isDebugEnabled) {
      console.info('[INFO]', ...args);
    }
  },

  /**
   * Log warnings (always shown)
   */
  warn: (...args: unknown[]) => {
    console.warn('[WARN]', ...args);
  },

  /**
   * Log errors (always shown)
   */
  error: (...args: unknown[]) => {
    console.error('[ERROR]', ...args);
  },

  /**
   * Log test mode operations
   */
  testMode: (message: string, ...args: unknown[]) => {
    if (isDevelopment || isDebugEnabled) {
      console.info('[TEST MODE]', message, ...args);
    }
  },
};
