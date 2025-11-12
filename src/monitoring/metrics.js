const DEFAULT_LATENCY_BUCKETS = [25, 50, 100, 250, 500, 1000, 2000, 5000];

function normalizeLabels(labels = {}) {
  if (!labels || typeof labels !== 'object') {
    return {};
  }

  return Object.entries(labels)
    .filter(([key, value]) => typeof key === 'string' && value !== undefined)
    .reduce((acc, [key, value]) => {
      acc[key] = typeof value === 'string' ? value : String(value);
      return acc;
    }, {});
}

function buildLabelKey(labels) {
  return Object.keys(labels)
    .sort()
    .map((key) => `${key}:${labels[key]}`)
    .join('|');
}

class MetricsRegistry {
  constructor(options = {}) {
    this.defaultBuckets = Array.isArray(options.defaultBuckets) && options.defaultBuckets.length > 0
      ? options.defaultBuckets.slice().sort((a, b) => a - b)
      : DEFAULT_LATENCY_BUCKETS;
    this.counters = new Map();
    this.histograms = new Map();
  }

  incrementCounter(name, value = 1, labels = {}) {
    if (typeof name !== 'string' || !name) {
      return 0;
    }

    const normalizedLabels = normalizeLabels(labels);
    const labelKey = buildLabelKey(normalizedLabels);
    if (!this.counters.has(name)) {
      this.counters.set(name, new Map());
    }

    const bucket = this.counters.get(name);
    const existing = bucket.get(labelKey) ?? { value: 0, labels: normalizedLabels };
    existing.value += Number.isFinite(value) ? value : 0;
    bucket.set(labelKey, existing);
    return existing.value;
  }

  recordLatency(name, durationMs, labels = {}, buckets = this.defaultBuckets) {
    if (typeof name !== 'string' || !name || !Number.isFinite(durationMs)) {
      return;
    }

    const normalizedLabels = normalizeLabels(labels);
    const labelKey = buildLabelKey(normalizedLabels);
    if (!this.histograms.has(name)) {
      this.histograms.set(name, new Map());
    }

    const series = this.histograms.get(name);
    const target = series.get(labelKey) ?? {
      count: 0,
      sum: 0,
      buckets: buckets.map((upperBound) => ({ upperBound, count: 0 })),
      labels: normalizedLabels
    };

    target.count += 1;
    target.sum += durationMs;
    let recorded = false;
    for (const bucket of target.buckets) {
      if (durationMs <= bucket.upperBound) {
        bucket.count += 1;
        recorded = true;
        break;
      }
    }
    if (!recorded && target.buckets.length > 0) {
      target.buckets[target.buckets.length - 1].count += 1;
    }

    series.set(labelKey, target);
  }

  startTimer(name, labels = {}, options = {}) {
    const start = typeof process?.hrtime?.bigint === 'function'
      ? process.hrtime.bigint()
      : Date.now();

    let stopped = false;

    return {
      stop: () => {
        if (stopped) {
          return 0;
        }
        stopped = true;
        const end = typeof start === 'bigint'
          ? Number(process.hrtime.bigint() - start) / 1_000_000
          : Date.now() - start;
        this.recordLatency(name, end, labels, options.buckets);
        return end;
      }
    };
  }

  trackExecution(name, labels, fn, options = {}) {
    if (typeof fn !== 'function') {
      throw new TypeError('trackExecution requires a function');
    }

    const timer = this.startTimer(name, labels, options);

    const onResolve = (result) => {
      timer.stop();
      return result;
    };

    const onReject = (error) => {
      timer.stop();
      throw error;
    };

    try {
      const result = fn();
      if (result && typeof result.then === 'function') {
        return result.then(onResolve, onReject);
      }
      return onResolve(result);
    } catch (error) {
      onReject(error);
      throw error;
    }
  }

  reset() {
    this.counters.clear();
    this.histograms.clear();
  }

  getCounters() {
    return Array.from(this.counters.entries()).map(([name, series]) => ({
      name,
      samples: Array.from(series.values()).map(({ value, labels }) => ({
        value,
        labels
      }))
    }));
  }

  getHistograms() {
    return Array.from(this.histograms.entries()).map(([name, series]) => ({
      name,
      samples: Array.from(series.values()).map((sample) => ({
        count: sample.count,
        sum: sample.sum,
        buckets: sample.buckets.map(({ upperBound, count }) => ({ upperBound, count })),
        labels: sample.labels
      }))
    }));
  }

  toJSON() {
    return {
      timestamp: new Date().toISOString(),
      counters: this.getCounters(),
      histograms: this.getHistograms()
    };
  }
}

const metrics = new MetricsRegistry();

function getMetricsSnapshot() {
  return metrics.toJSON();
}

export { MetricsRegistry, metrics, DEFAULT_LATENCY_BUCKETS, getMetricsSnapshot };
