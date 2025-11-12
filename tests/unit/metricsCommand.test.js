import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';

jest.mock('node:fs', () => ({
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn()
}));

jest.mock('../../src/monitoring/metrics.js', () => ({
  getMetricsSnapshot: jest.fn()
}));

jest.mock('../../src/shared/utils/error.js', () => ({
  handleError: jest.fn()
}));

const fs = require('node:fs');
const path = require('node:path');
const { getMetricsSnapshot } = require('../../src/monitoring/metrics.js');
const { handleError } = require('../../src/shared/utils/error.js');
const { handleMetricsCommand } = require('../../src/commands/metrics/handler.js');

describe('metrics command handler', () => {
  const originalConsoleLog = console.log;

  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn();
    process.exitCode = undefined;
  });

  afterEach(() => {
    console.log = originalConsoleLog;
    process.exitCode = undefined;
  });

  test('prints formatted report when metrics exist', async () => {
    const snapshot = {
      timestamp: '2024-01-01T00:00:00.000Z',
      counters: [
        {
          name: 'api.requests_total',
          samples: [{ value: 5, labels: { status: '2xx' } }]
        }
      ],
      histograms: []
    };
    getMetricsSnapshot.mockReturnValue(snapshot);

    const result = await handleMetricsCommand({});

    expect(result).toEqual(snapshot);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('RouterX Metrics Snapshot'));
    expect(process.exitCode).toBeUndefined();
  });

  test('prints JSON when --json option is set', async () => {
    const snapshot = { timestamp: '2024-01-02T00:00:00.000Z', counters: [], histograms: [] };
    getMetricsSnapshot.mockReturnValue(snapshot);

    await handleMetricsCommand({ json: true });

    expect(console.log).toHaveBeenCalledWith(JSON.stringify(snapshot, null, 2));
  });

  test('writes snapshot to disk when --output is provided', async () => {
    const snapshot = { timestamp: '2024-01-03T00:00:00.000Z', counters: [], histograms: [] };
    getMetricsSnapshot.mockReturnValue(snapshot);
    const outputPath = './artifacts/routerx-metrics.json';

    await handleMetricsCommand({ output: outputPath });

    expect(fs.mkdirSync).toHaveBeenCalledWith(expect.any(String), { recursive: true });
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining(path.normalize('routerx-metrics.json')),
      JSON.stringify(snapshot, null, 2)
    );
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Snapshot also written to'));
  });

  test('handles failures gracefully', async () => {
    const failure = new Error('boom');
    getMetricsSnapshot.mockImplementation(() => {
      throw failure;
    });

    const result = await handleMetricsCommand({});

    expect(result).toBeNull();
    expect(handleError).toHaveBeenCalledWith(failure, 'METRICS_EXPORT_FAILED', expect.any(Object));
    expect(process.exitCode).toBe(1);
  });
});
