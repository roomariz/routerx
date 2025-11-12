/**
 * @typedef {Object} MetricLabels
 * @property {string} [command]
 * @property {string} [operation]
 * @property {string} [status]
 * @property {string} [component]
 */

/**
 * @typedef {Object} CounterSample
 * @property {number} value
 * @property {MetricLabels} labels
 */

/**
 * @typedef {Object} HistogramBucket
 * @property {number} upperBound
 * @property {number} count
 */

/**
 * @typedef {Object} HistogramSample
 * @property {number} count
 * @property {number} sum
 * @property {HistogramBucket[]} buckets
 * @property {MetricLabels} labels
 */

/**
 * @typedef {Object} CounterSeries
 * @property {string} name
 * @property {CounterSample[]} samples
 */

/**
 * @typedef {Object} HistogramSeries
 * @property {string} name
 * @property {HistogramSample[]} samples
 */

/**
 * @typedef {Object} MetricsSnapshot
 * @property {string} timestamp
 * @property {CounterSeries[]} counters
 * @property {HistogramSeries[]} histograms
 */

export {};
