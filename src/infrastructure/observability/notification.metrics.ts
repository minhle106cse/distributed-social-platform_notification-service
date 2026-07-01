import { Counter } from 'prom-client'

/**
 * Counters that make the at-least-once machinery observable — the difference
 * between "dedup working" and "dedup silently eating real events" is invisible
 * without them. Registered on the prom-client default registry, so they surface
 * automatically on GET /metrics. Module-level singletons (Node caches the module),
 * so importing them anywhere yields the same instance — no double-registration.
 */

// Healthy under redelivery; a spike means a producer is republishing hard or a
// partition key is wrong. A sustained ~0 after deploys is also a signal (dedup
// never exercised → maybe the unique key isn't doing what you think).
export const dedupSkippedCounter = new Counter({
  name: 'notification_dedup_skipped_total',
  help: 'Notification rows skipped as duplicates (at-least-once redelivery)',
})

// Terminal failures isolated to <topic>.DLQ. Any non-zero rate deserves triage.
export const dlqCounter = new Counter({
  name: 'notification_dlq_total',
  help: 'Messages routed to the dead-letter queue',
  labelNames: ['reason'] as const,
})

// Bounded retries spent before a handler either succeeded or was dead-lettered.
export const handlerRetryCounter = new Counter({
  name: 'notification_handler_retry_total',
  help: 'Handler retry attempts (transient failures)',
  labelNames: ['eventType'] as const,
})
