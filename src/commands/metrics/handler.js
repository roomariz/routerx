import fs from 'node:fs';
import path from 'node:path';
import { getMetricsSnapshot } from '../../monitoring/metrics.js';
import { getSuccessMetricsReport } from '../../monitoring/successMetrics.js';
import { logger as baseLogger } from '../../monitoring/logger.js';
import { handleError } from '../../shared/utils/error.js';

function formatLabels(labels = {}) {
  const entries = Object.entries(labels || {});
  if (entries.length === 0) {
    return '';
  }
  const serialized = entries
    .map(([key, value]) => `${key}=${value}`)
    .join(', ');
  return ` (${serialized})`;
}

function formatBucketSummary(buckets = []) {
  if (!Array.isArray(buckets) || buckets.length === 0) {
    return '';
  }

  return buckets
    .map(({ upperBound, count }) => {
      const bound = upperBound ?? 'inf';
      const value = typeof bound === 'number' ? `${bound}ms` : bound;
      return `<=${value}:${count ?? 0}`;
    })
    .join(', ');
}

function formatSuccessMetricsSection(report) {
  const lines = [];
  if (!report || report.enabled === false) {
    lines.push('  - Success metrics tracking disabled');
    if (report?.reason) {
      lines.push(`    reason: ${report.reason}`);
    }
    return lines;
  }

  const metrics = Array.isArray(report.metrics) ? report.metrics : [];
  if (metrics.length === 0) {
    lines.push('  - No success metrics have been recorded yet');
    return lines;
  }

  for (const metric of metrics) {
    lines.push(
      `  - ${metric.label}: ${metric.current} (target ${metric.target}) — ${metric.status}`
    );
  }

  return lines;
}

function formatMetricsReport(snapshot, successReport) {
  const lines = [
    'RouterX Metrics Snapshot',
    `Timestamp: ${snapshot?.timestamp || 'unknown'}`
  ];

  const counters = Array.isArray(snapshot?.counters) ? snapshot.counters : [];
  const histograms = Array.isArray(snapshot?.histograms) ? snapshot.histograms : [];

  if (counters.length === 0 && histograms.length === 0) {
    lines.push('', 'No counters or histograms have been recorded yet.');
    return lines.join('\n');
  }

  if (counters.length > 0) {
    lines.push('', 'Counters');
    for (const counter of counters) {
      const samples = Array.isArray(counter.samples) ? counter.samples : [];
      if (samples.length === 0) {
        lines.push(`  - ${counter.name}: no samples`);
        continue;
      }

      for (const sample of samples) {
        lines.push(`  - ${counter.name}: ${sample.value ?? 0}${formatLabels(sample.labels)}`);
      }
    }
  }

  if (histograms.length > 0) {
    lines.push('', 'Histograms');
    for (const histogram of histograms) {
      const samples = Array.isArray(histogram.samples) ? histogram.samples : [];
      if (samples.length === 0) {
        lines.push(`  - ${histogram.name}: no samples`);
        continue;
      }

      for (const sample of samples) {
        const count = sample.count ?? 0;
        const avg = count > 0 ? (sample.sum ?? 0) / count : 0;
        const labelSuffix = formatLabels(sample.labels);
        lines.push(`  - ${histogram.name}: count=${count}, avg=${avg.toFixed(2)}ms${labelSuffix}`);
        const bucketSummary = formatBucketSummary(sample.buckets);
        if (bucketSummary) {
          lines.push(`      buckets: ${bucketSummary}`);
        }
      }
    }
  }

  lines.push('', 'Success Metrics');
  const successLines = formatSuccessMetricsSection(successReport);
  for (const successLine of successLines) {
    lines.push(successLine);
  }

  return lines.join('\n');
}

function writeSnapshotToFile(snapshot, outputPath) {
  const resolvedPath = path.resolve(outputPath);
  const directory = path.dirname(resolvedPath);
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(resolvedPath, JSON.stringify(snapshot, null, 2));
  return resolvedPath;
}

/**
 * Handle the metrics command action by emitting the current snapshot
 * @param {Object} options - Command options
 * @param {Object} context - Execution context containing logger/traceId
 */
export async function handleMetricsCommand(options = {}, context = {}) {
  const { logger: commandLogger = baseLogger, traceId } = context;
  try {
    const snapshot = getMetricsSnapshot();
    const successReport = getSuccessMetricsReport();
    let resolvedOutputPath;

    if (options.output) {
      resolvedOutputPath = writeSnapshotToFile(snapshot, options.output);
    }

    if (options.json) {
      console.log(JSON.stringify(snapshot, null, 2));
    } else {
      console.log(formatMetricsReport(snapshot, successReport));
      if (resolvedOutputPath) {
        console.log(`Snapshot also written to: ${resolvedOutputPath}`);
      }
    }

    commandLogger.info('Metrics snapshot exported', {
      traceId,
      counters: snapshot?.counters?.length || 0,
      histograms: snapshot?.histograms?.length || 0,
      outputPath: resolvedOutputPath,
      successMetricsEnabled: successReport?.enabled !== false,
      successMetricsStatuses: successReport?.metrics?.map((metric) => ({
        key: metric.key,
        status: metric.status
      }))
    });

    return snapshot;
  } catch (error) {
    commandLogger.error('Failed to export metrics snapshot', { error, traceId });
    handleError(error, 'METRICS_EXPORT_FAILED', {
      operation: 'handleMetricsCommand',
      options,
      traceId
    });
    process.exitCode = 1;
    return null;
  }
}
