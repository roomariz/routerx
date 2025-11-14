// src/cli/ui/layout.js
// Helpers for composing consistent CLI blocks, dividers, and typography.

import chalk from 'chalk';
import { palette } from './theme.js';

const ANSI_REGEX = /\x1b\[[0-9;]*m/g;

export function stripAnsi(text = '') {
  return text.replace(ANSI_REGEX, '');
}

export function measure(text = '') {
  return stripAnsi(text).length;
}

export function pad(text = '', width = 0, align = 'left') {
  const printable = measure(text);
  if (printable >= width) {
    return text;
  }

  const padding = ' '.repeat(width - printable);
  if (align === 'right') {
    return `${padding}${text}`;
  }

  if (align === 'center') {
    const half = Math.floor(padding.length / 2);
    return `${' '.repeat(padding.length - half)}${text}${' '.repeat(half)}`;
  }

  return `${text}${padding}`;
}

export function consoleWidth(fallback = 60) {
  const width = process.stdout?.columns;
  if (Number.isFinite(width) && width > 0) {
    return Math.min(Math.max(width - 2, 40), 120);
  }
  return fallback;
}

export function divider(char = '─', width) {
  const lineWidth = width ?? consoleWidth();
  return palette.muted(char.repeat(lineWidth));
}

export function sectionTitle(text, options = {}) {
  const prefix = options.icon ? `${options.icon} ` : '';
  const suffix = options.meta ? palette.muted(` — ${options.meta}`) : '';
  return `${palette.title(`${prefix}${text}`)}${suffix}`;
}

export function tipLine(text) {
  return `${chalk.bold('Tip:')} ${palette.tip(text)}`;
}
