import { describe, test, expect } from '@jest/globals';
import { MetricsRegistry, DEFAULT_LATENCY_BUCKETS } from '../../src/monitoring/metrics.js';

describe('MetricsRegistry', () => {
  test('increments counters per label combination', () => {
    const registry = new MetricsRegistry();

    registry.incrementCounter('api.calls', 1, { operation: 'chat' });
    registry.incrementCounter('api.calls', 2, { operation: 'chat' });
    registry.incrementCounter('api.calls', 1, { operation: 'models' });

    const snapshot = registry.toJSON();
    const series = snapshot.counters.find((entry) => entry.name === 'api.calls');

    expect(series).toBeDefined();
    expect(series.samples).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value: 3, labels: { operation: 'chat' } }),
        expect.objectContaining({ value: 1, labels: { operation: 'models' } })
      ])
    );
  });

  test('records latency using histogram buckets', () => {
    const registry = new MetricsRegistry({ defaultBuckets: [10, 50, 100] });

    registry.recordLatency('api.duration', 5, { operation: 'chat' });
    registry.recordLatency('api.duration', 40, { operation: 'chat' });
    registry.recordLatency('api.duration', 90, { operation: 'chat' });

    const snapshot = registry.toJSON();
    const histogram = snapshot.histograms.find((entry) => entry.name === 'api.duration');

    expect(histogram).toBeDefined();
    const [sample] = histogram.samples;
    expect(sample.count).toBe(3);
    expect(sample.buckets).toEqual([
      { upperBound: 10, count: 1 },
      { upperBound: 50, count: 1 },
      { upperBound: 100, count: 1 }
    ]);
  });

  test('records values above the largest bucket in the final bucket', () => {
    const registry = new MetricsRegistry({ defaultBuckets: [25, 50] });
    registry.recordLatency('overflow.duration', 80);
    const histogram = registry.toJSON().histograms.find((entry) => entry.name === 'overflow.duration');
    expect(histogram?.samples?.[0]?.buckets).toEqual([
      { upperBound: 25, count: 0 },
      { upperBound: 50, count: 1 }
    ]);
  });

  test('trackExecution captures sync and async durations', async () => {
    const registry = new MetricsRegistry();

    registry.trackExecution('sync.op', { operation: 'sync' }, () => {});
    await registry.trackExecution('async.op', { operation: 'async' }, async () => {
      return new Promise((resolve) => setTimeout(resolve, 5));
    });

    const snapshot = registry.toJSON();
    expect(snapshot.histograms.length).toBeGreaterThanOrEqual(1);
    const syncSample = snapshot.histograms
      .find((entry) => entry.name === 'sync.op')
      ?.samples?.[0];
    expect(syncSample?.count).toBe(1);
    const asyncSample = snapshot.histograms
      .find((entry) => entry.name === 'async.op')
      ?.samples?.[0];
    expect(asyncSample?.count).toBe(1);
  });

  test('uses default latency buckets when none supplied', () => {
    const registry = new MetricsRegistry();
    registry.recordLatency('default.duration', 30);
    const histogram = registry.toJSON().histograms.find((entry) => entry.name === 'default.duration');
    expect(histogram?.samples?.[0]?.buckets.map((bucket) => bucket.upperBound)).toEqual(DEFAULT_LATENCY_BUCKETS);
  });
});
