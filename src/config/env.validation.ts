import { z } from 'zod'

export const envValidationSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NOTIFICATION_SERVICE_PORT: z.coerce.number().default(4003),
  CORS_ALLOWED_ORIGINS: z.string().default('http://localhost:3001'),
  NOTIFICATION_DATABASE_URL: z.string().url(),
  JWT_PUBLIC_KEY: z.string().min(100),
  KAFKA_BROKERS: z.string().default('localhost:9092'),
  KAFKA_CLIENT_ID: z.string().default('notification-service'),
  KAFKA_NOTIFICATION_CONSUMER_GROUP: z.string().default('notification-service-group'),
  KAFKA_CONSUMER_MAX_RETRIES: z.coerce.number().int().min(0).default(3),
  KAFKA_CONSUMER_RETRY_BACKOFF_MS: z.coerce.number().int().min(0).default(500),
})

export function validate(config: Record<string, unknown>) {
  const result = envValidationSchema.safeParse(config)
  if (!result.success) {
    throw new Error(`Environment variables validation failed: ${result.error.message}`)
  }
  return result.data
}
