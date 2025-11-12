// src/monitoring/successMetrics.js
// Tracks RouterX success metrics (reliability, performance, observability, resilience, maintainability)

import { featureFlags } from '../shared/utils/featureFlags.js';

const DEFAULT_BASELINE_ERROR_RATE = Number(process.env.ROUTERX_BASELINE_ERROR_RATE ?? 0.1);
const DEFAULT_ERROR_REDUCTION_TARGET = Number(process.env.ROUTERX_TARGET_ERROR_REDUCTION ?? 0.5);
const DEFAULT_API_SUCCESS_TARGET = Number(process.env.ROUTERX_TARGET_API_SUCCESS_RATE ?? 0.99);
const DEFAULT_MTTR_BASELINE_MS = Number(process.env.ROUTERX_BASELINE_MTTR_MS ?? 3_600_000); // 60 minutes
const DEFAULT_MTTR_REDUCTION = Number(process.env.ROUTERX_TARGET_MTTR_REDUCTION ?? 0.3);

function clampPercentage(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  if (parsed < 0) {
    return 0;
  }
  if (parsed > 1) {
    return 1;
  }
  return parsed;
}

function toMilliseconds(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function formatPercentage(value) {
  const percent = value * 100;
  if (!Number.isFinite(percent)) {
    return '0%';
  }
  return `${percent.toFixed(2)}%`;
}

class SuccessMetricsTracker {
  constructor() {
    this.targets = {
      baselineErrorRate: clampPercentage(DEFAULT_BASELINE_ERROR_RATE, 0.1),
      errorReduction: clampPercentage(DEFAULT_ERROR_REDUCTION_TARGET, 0.5),
      apiSuccessRate: clampPercentage(DEFAULT_API_SUCCESS_TARGET, 0.99),
      mttrBaselineMs: toMilliseconds(DEFAULT_MTTR_BASELINE_MS, 3_600_000),
      mttrReduction: clampPercentage(DEFAULT_MTTR_REDUCTION, 0.3)
    };
    this.reset();
  }

  reset() {
    this.state = {
      operations: 0,
      errors: 0,
      apiCalls: 0,
      apiFailures: 0,
      errorsLogged: 0,
      resilienceIncidents: 0,
      resilienceRecoveries: 0,
      resilienceFailures: 0,
      incidents: new Map(),
      operationDurations: []
    };
  }

  isEnabled() {
    return featureFlags.isEnabled('successMetricsTracking');
  }

  ensureIncident(incidentId) {
    if (!incidentId) {
      return null;
    }

    if (!this.state.incidents.has(incidentId)) {
      this.state.incidents.set(incidentId, {
        incidentId,
        operation: undefined,
        retriesTracked: false,
        resolved: false,
        failed: false,
        durationMs: 0,
        attempts: 0
      });
    }

    return this.state.incidents.get(incidentId);
  }

  recordOperation({ success = true, durationMs, incidentId, operation } = {}) {
    if (!this.isEnabled()) {
      return;
    }

    this.state.operations += 1;
    if (!success) {
      this.state.errors += 1;
    }

    if (Number.isFinite(durationMs)) {
      this.state.operationDurations.push(durationMs);
    }

    if (incidentId) {
      const incident = this.ensureIncident(incidentId);
      if (incident) {
        incident.operation = incident.operation ?? operation;
        if (Number.isFinite(durationMs)) {
          incident.durationMs = durationMs;
        }
      }
    }
  }

  recordApiCall({ operation, success = true, attempts = 1, durationMs, incidentId } = {}) {
    if (!this.isEnabled()) {
      return;
    }

    this.state.apiCalls += 1;
    if (!success) {
      this.state.apiFailures += 1;
    }

    this.recordOperation({ success, durationMs, incidentId, operation });

    if (incidentId) {
      const incident = this.ensureIncident(incidentId);
      if (incident) {
        incident.operation = incident.operation ?? operation;
        incident.attempts = Math.max(incident.attempts, attempts);
        incident.durationMs = Number.isFinite(durationMs) ? durationMs : incident.durationMs;
        incident.resolved = success ? true : incident.resolved;
        incident.failed = success ? incident.failed : true;
      }
    }
  }

  recordErrorLogged({ incidentId, code } = {}) {
    if (!this.isEnabled()) {
      return;
    }

    this.state.errorsLogged += 1;

    if (incidentId) {
      const incident = this.ensureIncident(incidentId);
      if (incident) {
        incident.lastErrorCode = code;
      }
    }
  }

  recordResilienceEvent(type, meta = {}) {
    if (!this.isEnabled() || !featureFlags.isEnabled('resilienceTelemetry')) {
      return;
    }

    const incident = meta.incidentId ? this.ensureIncident(meta.incidentId) : null;
    if (incident && meta.operation) {
      incident.operation = meta.operation;
    }

    switch (type) {
      case 'retry_attempt':
        if (incident && !incident.retriesTracked) {
          incident.retriesTracked = true;
          this.state.resilienceIncidents += 1;
        } else if (!incident) {
          this.state.resilienceIncidents += 1;
        }
        break;
      case 'automatic_recovery':
        this.state.resilienceRecoveries += 1;
        if (incident) {
          incident.resolved = true;
        }
        break;
      case 'failure':
        this.state.resilienceFailures += 1;
        if (incident) {
          incident.failed = true;
        }
        break;
      default:
        break;
    }
  }

  recordIncidentDuration(durationMs, meta = {}) {
    if (!this.isEnabled() || !meta.incidentId) {
      return;
    }

    const incident = this.ensureIncident(meta.incidentId);
    if (!incident) {
      return;
    }

    incident.durationMs = Math.max(0, Number(durationMs) || 0);
    if (meta.operation) {
      incident.operation = meta.operation;
    }
    if (typeof meta.resolved === 'boolean') {
      incident.resolved = meta.resolved;
    }
  }

  evaluateStatus(conditionMet, dataPoints) {
    if (!Number.isFinite(dataPoints) || dataPoints <= 0) {
      return 'insufficient_data';
    }
    return conditionMet ? 'on_track' : 'at_risk';
  }

  getReport() {
    if (!this.isEnabled()) {
      return {
        enabled: false,
        reason: 'successMetricsTracking feature flag disabled',
        timestamp: new Date().toISOString()
      };
    }

    const targetErrorRate = Math.max(
      this.targets.baselineErrorRate * (1 - this.targets.errorReduction),
      0
    );
    const reliabilityErrorRate = this.state.operations === 0
      ? 0
      : this.state.errors / this.state.operations;
    const reliabilityStatus = this.evaluateStatus(
      reliabilityErrorRate <= targetErrorRate,
      this.state.operations
    );

    const apiSuccessRate = this.state.apiCalls === 0
      ? 1
      : 1 - (this.state.apiFailures / this.state.apiCalls);
    const performanceStatus = this.evaluateStatus(
      apiSuccessRate >= this.targets.apiSuccessRate,
      this.state.apiCalls
    );

    const observabilityRatio = this.state.errors === 0
      ? 1
      : this.state.errorsLogged / this.state.errors;
    const observabilityStatus = this.evaluateStatus(
      observabilityRatio >= 1,
      this.state.errors
    );

    const resilienceRatio = this.state.resilienceIncidents === 0
      ? 1
      : this.state.resilienceRecoveries / this.state.resilienceIncidents;
    const resilienceStatus = this.evaluateStatus(
      resilienceRatio >= 1,
      this.state.resilienceIncidents
    );

    const incidents = Array.from(this.state.incidents.values());
    const resolvedIncidents = incidents.filter((incident) => incident.resolved);
    const mttr = resolvedIncidents.length === 0
      ? null
      : resolvedIncidents.reduce((sum, incident) => sum + incident.durationMs, 0) / resolvedIncidents.length;
    const mttrTarget = this.targets.mttrBaselineMs * (1 - this.targets.mttrReduction);
    const maintainabilityStatus = this.evaluateStatus(
      mttr !== null && mttr <= mttrTarget,
      resolvedIncidents.length
    );

    return {
      enabled: true,
      timestamp: new Date().toISOString(),
      metrics: [
        {
          key: 'reliability',
          label: 'Reliability',
          target: `≤ ${formatPercentage(targetErrorRate)} error rate`,
          current: formatPercentage(reliabilityErrorRate),
          status: reliabilityStatus,
          details: {
            operations: this.state.operations,
            errors: this.state.errors
          }
        },
        {
          key: 'performance',
          label: 'Performance',
          target: `≥ ${formatPercentage(this.targets.apiSuccessRate)} API success`,
          current: formatPercentage(apiSuccessRate),
          status: performanceStatus,
          details: {
            apiCalls: this.state.apiCalls,
            failures: this.state.apiFailures
          }
        },
        {
          key: 'observability',
          label: 'Observability',
          target: '100% of error conditions logged',
          current: formatPercentage(observabilityRatio),
          status: observabilityStatus,
          details: {
            errors: this.state.errors,
            logged: this.state.errorsLogged
          }
        },
        {
          key: 'resilience',
          label: 'Resilience',
          target: 'Automatic recovery for incident paths',
          current: formatPercentage(resilienceRatio),
          status: resilienceStatus,
          details: {
            incidents: this.state.resilienceIncidents,
            recoveries: this.state.resilienceRecoveries,
            failures: this.state.resilienceFailures
          }
        },
        {
          key: 'maintainability',
          label: 'Maintainability',
          target: `≤ ${(mttrTarget / 1000).toFixed(1)}s MTTR`,
          current: mttr === null ? 'n/a' : `${(mttr / 1000).toFixed(1)}s`,
          status: maintainabilityStatus,
          details: {
            resolvedIncidents: resolvedIncidents.length,
            mttrMs: mttr
          }
        }
      ],
      summary: {
        operationsTracked: this.state.operations,
        incidentsTracked: incidents.length
      }
    };
  }
}

const successMetrics = new SuccessMetricsTracker();

export function getSuccessMetricsReport() {
  return successMetrics.getReport();
}

export { successMetrics };
