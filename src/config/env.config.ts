import { registerAs } from '@nestjs/config'
import { validate } from './env.validation'

/**
 * Single source of truth for defaults is envValidationSchema — this factory
 * only reshapes the already-validated/coerced env into camelCase, it never
 * re-declares a default value (that used to drift silently from the schema).
 */
export const envConfig = registerAs('env', () => {
  const env = validate(process.env)
  return {
    nodeEnv: env.NODE_ENV,
    port: env.NOTIFICATION_SERVICE_PORT,
    corsAllowedOrigins: env.CORS_ALLOWED_ORIGINS,
    // JWT_PUBLIC_KEY is base64-encoded in .env (same pattern as core-api)
    jwtPublicKey: Buffer.from(env.JWT_PUBLIC_KEY, 'base64').toString('utf-8'),
    kafkaBrokers: env.KAFKA_BROKERS.split(','),
    kafkaClientId: env.NOTIFICATION_KAFKA_CLIENT_ID,
    // Group handles knowledge-events + engagement-events (one concern: notifications).
    kafkaNotificationConsumerGroup: env.KAFKA_NOTIFICATION_CONSUMER_GROUP,
    kafkaConsumerMaxRetries: env.KAFKA_CONSUMER_MAX_RETRIES,
    kafkaConsumerRetryBackoffMs: env.KAFKA_CONSUMER_RETRY_BACKOFF_MS,
  }
})
