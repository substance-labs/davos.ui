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
  debug: (...args: any[]) => {
    if (isDevelopment || isDebugEnabled) {
      console.log('[DEBUG]', ...args);
    }
  },

  /**
   * Log informational messages
   */
  info: (...args: any[]) => {
    if (isDevelopment || isDebugEnabled) {
      console.log('[INFO]', ...args);
    }
  },

  /**
   * Log warnings (always shown)
   */
  warn: (...args: any[]) => {
    console.warn('[WARN]', ...args);
  },

  /**
   * Log errors (always shown)
   */
  error: (...args: any[]) => {
    console.error('[ERROR]', ...args);
  },

  /**
   * Log test mode operations
   */
  testMode: (message: string, ...args: any[]) => {
    if (isDevelopment || isDebugEnabled) {
      console.log('[TEST MODE]', message, ...args);
    }
  }
};
