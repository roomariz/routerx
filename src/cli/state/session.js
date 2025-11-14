// src/cli/state/session.js
// Tracks global CLI session information such as verbosity and banner state.

const sessionState = {
  verbose: false,
  environment: process.env.NODE_ENV || 'development',
  startedAt: Date.now(),
  bannerShown: false
};

/**
 * Initialize the CLI session for the current invocation.
 * @param {Object} [options]
 * @param {boolean} [options.verbose=false]
 */
export function initializeCliSession(options = {}) {
  sessionState.verbose = Boolean(options.verbose);
  sessionState.environment = process.env.NODE_ENV || 'development';
  sessionState.startedAt = Date.now();
}

/**
 * Return the current CLI session snapshot.
 * @returns {{verbose: boolean, environment: string, startedAt: number, bannerShown: boolean}}
 */
export function getCliSession() {
  return { ...sessionState };
}

/**
 * Whether the CLI is running in verbose mode.
 * @returns {boolean}
 */
export function isVerboseMode() {
  return Boolean(sessionState.verbose);
}

/**
 * Mark the banner as rendered so we avoid duplicate output.
 */
export function markBannerShown() {
  sessionState.bannerShown = true;
}

/**
 * Whether the startup banner has already been shown.
 * @returns {boolean}
 */
export function hasBannerBeenShown() {
  return Boolean(sessionState.bannerShown);
}

/**
 * Merge arbitrary values into the session state.
 * @param {Object} patch
 */
export function updateCliSession(patch = {}) {
  Object.assign(sessionState, patch);
}
