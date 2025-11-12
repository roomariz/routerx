# RouterX Operational Upgrade Guide

This guide explains how to adopt the new reliability and observability capabilities that were prioritized in the Reliability Architecture Plan (sections 9 and 10). Each change ships behind a feature flag so you can roll out safely across environments.

## 1. Feature Flags for Gradual Rollout

All operational enhancements can be toggled with configuration or environment variables:

| Feature | Config Key (`config.json`) | Environment Variable | Default |
| --- | --- | --- | --- |
| Async logging pipeline | `features.monitoringAsyncLogging` | `ROUTERX_FEATURE_MONITORING_ASYNC_LOGGING` | `false` |
| High-frequency log sampling | `features.monitoringLogSampling` | `ROUTERX_FEATURE_MONITORING_LOG_SAMPLING` | `false` |
| Success metrics tracking | `features.successMetricsTracking` | `ROUTERX_FEATURE_SUCCESS_METRICS` | `true` |
| Resilience telemetry hooks | `features.resilienceTelemetry` | `ROUTERX_FEATURE_RESILIENCE_TELEMETRY` | `true` |

Example `config.json` snippet:

```json
{
  "features": {
    "monitoringAsyncLogging": true,
    "monitoringLogSampling": true,
    "successMetricsTracking": true
  }
}
```

> Feature flags are evaluated in this order: configuration file → environment overrides → default. Changes take effect without restarting the CLI because the logger and metrics pipeline subscribe to flag updates.

## 2. Logging Performance Mitigations

- **Asynchronous logging queue** – When `monitoringAsyncLogging` is enabled, log writes happen via a non-blocking queue that flushes on `setImmediate`. This keeps API calls on the fast path and addresses the “monitoring overhead” risk.
- **Sampling for noisy levels** – When `monitoringLogSampling` is on, debug logs default to a 35% sample rate (override with `ROUTERX_LOG_SAMPLE_DEBUG=0.1`, etc.). JSON logs still capture every event.
- **Graceful shutdown** – Pending log batches flush on `beforeExit`.

To verify:

```bash
ROUTERX_FEATURE_MONITORING_ASYNC_LOGGING=1 routerx chat "ping"
ROUTERX_LOG_SAMPLE_DEBUG=0.2 routerx metrics --json
```

## 3. Success Metrics Instrumentation

The CLI now records the Success Metrics defined in the plan:

| Metric | Description | Target |
| --- | --- | --- |
| Reliability | Error rate across API operations | ≤ 50% of baseline (defaults to 5%) |
| Performance | API success rate | ≥ 99% |
| Observability | Logged error coverage | 100% |
| Resilience | Automatic recoveries vs. incidents | 100% |
| Maintainability | Mean time to recover | ≥ 30% faster than baseline (defaults to 42 min) |

View them via `routerx metrics` (text) or `routerx metrics --json` (machine-readable). JSON payloads now include:

```json
{
  "metrics": { "...existing counters..." },
  "successMetrics": {
    "enabled": true,
    "metrics": [
      { "key": "reliability", "current": "1.20%", "target": "≤ 5.00%", "status": "on_track" },
      { "key": "performance", "...": "at_risk" }
    ]
  }
}
```

Baseline and target adjustments:

- `ROUTERX_BASELINE_ERROR_RATE`
- `ROUTERX_TARGET_ERROR_REDUCTION`
- `ROUTERX_TARGET_API_SUCCESS_RATE`
- `ROUTERX_BASELINE_MTTR_MS`
- `ROUTERX_TARGET_MTTR_REDUCTION`

## 4. Configuration Compatibility Layer

A dedicated compatibility pass now upgrades legacy keys automatically. The loader logs a warning showing every remapped key. Supported aliases include:

| Legacy Key | New Key |
| --- | --- |
| `requestTimeout` / `requestTimeoutMs` | `timeout` |
| `retry.maxAttempts` | `resilience.maxRetries` |
| `retry.baseDelay` | `resilience.baseDelayMs` |
| `retry.maxDelay` | `resilience.maxDelayMs` |
| `retry.jitter` | `resilience.jitterMs` |
| `breaker.threshold` | `resilience.breakerThreshold` |
| `breaker.cooldown` | `resilience.breakerCooldownMs` |
| `features.asyncLogging` | `features.monitoringAsyncLogging` |
| `features.logSampling` | `features.monitoringLogSampling` |

If any of these fields appear in your existing `config.json`, the loader will migrate them at runtime and keep backward compatibility.

## 5. Staging Verification Checklist

1. Copy `config.staging.json` to the environment where you exercise the CLI (`ROUTERX_CONFIG_PATH` points to it).
2. Run the metrics command to see the success-metric payload with the feature flags enabled:

```powershell
$env:ROUTERX_CONFIG_PATH = ".\config.staging.json"
node .\bin\routerx.js metrics --json
```

You should see the `successMetrics` block alongside the traditional counters/histograms. Keep this workflow in staging until you are satisfied with the log sampling rate and async logging behaviour, then promote the same config to production.

## 6. Continuous Metrics Export

Add a periodic export (e.g., in CI/CD) so you always have a time-series for the section‑10 targets:

```bash
npm run ci:metrics
```

The `ci:metrics` script already writes the JSON snapshot to `./artifacts/routerx-metrics.json`, which you can archive or push to your observability backend.

---

By staging the rollout with feature flags, asynchronous logging, and measurable success targets, RouterX now implements the risk mitigations and success metrics outlined in the architecture plan.
