/**
 * OTLP Logs helper for forwarding analytics to OpenTelemetry Collector
 * Sends sanitized analytics events to SigNoz via OTLP/HTTP
 */

export interface OtelLogRecord {
  body: any;
  attributes: Record<string, any>;
  severityText?: string;
}

interface OtlpLogsPayload {
  resourceLogs: Array<{
    resource: {
      attributes: Array<{
        key: string;
        value: { stringValue?: string; intValue?: number; boolValue?: boolean };
      }>;
    };
    scopeLogs: Array<{
      scope: {
        name: string;
        version: string;
      };
      logRecords: Array<{
        timeUnixNano: string;
        observedTimeUnixNano: string;
        severityNumber: number;
        severityText: string;
        body: {
          stringValue: string;
        };
        attributes: Array<{
          key: string;
          value: { stringValue?: string; intValue?: number; boolValue?: boolean };
        }>;
      }>;
    }>;
  }>;
}

/**
 * Redact sensitive strings from log content
 */
function redactSensitive(str: string): string {
  return str
    .replace(/bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer ***')
    .replace(/pwd=.*?(\s|$)/gi, 'pwd=*** ')
    .replace(/password=.*?(\s|$)/gi, 'password=*** ')
    .replace(/api[_-]?key\s*[:=]\s*[A-Za-z0-9._-]+/gi, 'api_key=***')
    .replace(/auth\s*[:=]\s*[A-Za-z0-9._-]+/gi, 'auth=***')
    .replace(/secret\s*[:=]\s*[A-Za-z0-9._-]+/gi, 'secret=***');
}

/**
 * Convert timestamp to nanoseconds as BigInt string
 */
function timeToNanos(timestamp?: number): string {
  const ts = timestamp || Date.now();
  return (BigInt(ts) * BigInt(1000000)).toString();
}

/**
 * Create OTLP attribute from key-value pair
 */
function createAttribute(key: string, value: any): { key: string; value: any } {
  const attr: { key: string; value: any } = { key, value: {} };
  
  if (typeof value === 'string') {
    attr.value.stringValue = redactSensitive(value);
  } else if (typeof value === 'number') {
    attr.value.intValue = value;
  } else if (typeof value === 'boolean') {
    attr.value.boolValue = value;
  } else {
    attr.value.stringValue = redactSensitive(String(value));
  }
  
  return attr;
}

/**
 * Send analytics logs to OpenTelemetry Collector via OTLP/HTTP
 */
export async function sendOtelLogs(records: OtelLogRecord[]): Promise<void> {
  if (!records.length) return;

  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:5318';
  const url = `${endpoint}/v1/logs`;
  
  const nowNanos = timeToNanos();
  
  const payload: OtlpLogsPayload = {
    resourceLogs: [
      {
        resource: {
          attributes: [
            { key: 'service.name', value: { stringValue: 'resonai-analytics' } },
            { key: 'service.namespace', value: { stringValue: 'platform' } },
            { key: 'deployment.environment', value: { stringValue: 'local' } },
          ],
        },
        scopeLogs: [
          {
            scope: {
              name: 'resonai-analytics-client',
              version: '1.0.0',
            },
            logRecords: records.map((record) => ({
              timeUnixNano: nowNanos,
              observedTimeUnixNano: nowNanos,
              severityNumber: 9, // INFO level
              severityText: record.severityText || 'INFO',
              body: {
                stringValue: redactSensitive(JSON.stringify(record.body)),
              },
              attributes: Object.entries(record.attributes).map(([key, value]) =>
                createAttribute(key, value)
              ),
            })),
          },
        ],
      },
    ],
  };

  // Retry logic with exponential backoff
  const maxRetries = 2;
  const baseDelay = 250; // ms
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        // Success - no need to retry
        return;
      }

      if (response.status >= 400 && response.status < 500) {
        // Client error - don't retry
        console.warn(`OTLP logs rejected: ${response.status} ${response.statusText}`);
        return;
      }

      // Server error - retry if attempts remain
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      console.warn(`OTLP logs failed after ${maxRetries + 1} attempts: ${response.status}`);
      return;

    } catch (error) {
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      console.warn(`OTLP logs network error after ${maxRetries + 1} attempts:`, error);
      return;
    }
  }
}

/**
 * Convert Resonai analytics event to OTel log record
 */
export function createAnalyticsLogRecord(event: any): OtelLogRecord {
  const {
    event: eventName,
    variant,
    session_id,
    ttv_ms,
    ua,
    cohort,
    user_id,
    props,
    ts,
    ...rest
  } = event;

  const attributes: Record<string, any> = {
    dataset: 'resonai_analytics',
    event: eventName,
  };

  // Add optional attributes if present
  if (variant) attributes.variant = typeof variant === 'object' ? JSON.stringify(variant) : variant;
  if (session_id) attributes.session_id = session_id;
  if (ttv_ms) attributes.ttv_ms = ttv_ms;
  if (ua) attributes.ua = ua;
  if (cohort) attributes.cohort = cohort;
  if (user_id) attributes.user_id = user_id;

  // Add any additional properties from props or rest
  const allProps = { ...props, ...rest };
  Object.entries(allProps).forEach(([key, value]) => {
    if (value !== undefined && key !== 'event' && key !== 'ts') {
      attributes[key] = value;
    }
  });

  return {
    body: event,
    attributes,
    severityText: 'INFO',
  };
}
