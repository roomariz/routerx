// src/cli/ui/theme.js
// Shared color palette and icon helpers for RouterX CLI output.

import chalk from 'chalk';

export const palette = {
  info: chalk.cyan,
  muted: chalk.gray,
  accent: chalk.blue,
  success: chalk.green,
  warning: chalk.hex('#f4c542'),
  danger: chalk.red,
  title: chalk.bold,
  tip: chalk.dim
};

export const statusIcons = {
  healthy: '✅',
  warning: '⚠️',
  unhealthy: '❌',
  info: 'ℹ️'
};

export function statusColor(status) {
  switch (status) {
    case 'healthy':
    case 'success':
      return palette.success;
    case 'warning':
    case 'degraded':
      return palette.warning;
    case 'unhealthy':
    case 'error':
      return palette.danger;
    default:
      return palette.info;
  }
}

/**
 * Format a status badge with color and icon.
 * @param {string} status
 * @param {string} [label]
 * @returns {string}
 */
export function formatStatusBadge(status, label) {
  const normalized = (status || '').toLowerCase();
  const icon = statusIcons[normalized] || statusIcons.info;
  const text = label || normalized.toUpperCase() || 'STATUS';
  const color = statusColor(normalized);
  return color(`${icon} ${text}`);
}
