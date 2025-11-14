// src/cli/ui/table.js
// Minimal table renderer (cli-table3 style) without external dependency.

import chalk from 'chalk';
import { pad, measure, divider } from './layout.js';

function normalizeColumns(columns = []) {
  return columns.map((col) => {
    if (typeof col === 'string') {
      return { header: col, align: 'left' };
    }
    return {
      header: col.header ?? '',
      align: col.align ?? 'left'
    };
  });
}

function computeColumnWidths(columns, rows) {
  return columns.map((column, index) => {
    const headerWidth = measure(column.header);
    const cellWidth = rows.reduce((max, row) => {
      const cell = row[index] ?? '';
      return Math.max(max, measure(cell));
    }, 0);
    return Math.max(headerWidth, cellWidth);
  });
}

function renderRow(columns, widths, rowValues, vertical, padding) {
  return columns
    .map((col, index) => {
      const width = widths[index];
      const raw = rowValues[index] ?? '';
      return ` ${pad(raw, width, col.align)} `;
    })
    .join(vertical);
}

/**
 * Render a table with clean dividers similar to cli-table3.
 * @param {Array<{header: string, align?: 'left'|'right'|'center'}|string>} columns
 * @param {string[][]} rows
 * @param {Object} [options]
 * @param {string} [options.vertical='│']
 * @param {string} [options.horizontal='─']
 * @returns {string}
 */
export function renderTable(columns = [], rows = [], options = {}) {
  const normalizedColumns = normalizeColumns(columns);
  const vertical = options.vertical ?? '│';
  const horizontal = options.horizontal ?? '─';
  const crossing = options.crossing ?? '┼';

  const widths = computeColumnWidths(normalizedColumns, rows);
  const headerLine = renderRow(normalizedColumns, widths, normalizedColumns.map((col) => col.header), ` ${vertical} `);
  const separatorBits = widths.map((width) => horizontal.repeat(width + 2));
  const separatorLine = chalk.dim(separatorBits.join(`${crossing}`));

  const bodyLines = rows.map((row) => renderRow(normalizedColumns, widths, row, ` ${vertical} `));

  return [headerLine, divider(horizontal, separatorLine.length), ...bodyLines].join('\n');
}
