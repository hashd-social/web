/**
 * Dev Utilities Index
 * 
 * Import these utilities for development/testing purposes.
 * These should NOT be used in production builds.
 */

export { DevToolsDrawer } from './DevToolsDrawer';

// Log dev tools availability
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  console.log('🛠️ Dev tools available - click the logo in the footer to open');
}
