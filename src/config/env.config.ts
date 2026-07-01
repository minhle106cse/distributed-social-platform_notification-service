import { registerAs } from "@nestjs/config";

export const envConfig = registerAs("env", () => ({
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.NOTIFICATION_SERVICE_PORT ?? 4003),
  corsAllowedOrigins: process.env.CORS_ALLOWED_ORIGINS,
  // JWT_PUBLIC_KEY is base64-encoded in .env (same pattern as core-api)
  jwtPublicKey: Buffer.from(process.env.JWT_PUBLIC_KEY!, "base64").toString(
    "utf-8",
  ),
  kafkaBrokers: (process.env.KAFKA_BROKERS ?? "localhost:9092").split(","),
  kafkaClientId: process.env.KAFKA_CLIENT_ID ?? "notification-service",
  kafkaNotificationConsumerGroup:
    process.env.KAFKA_NOTIFICATION_CONSUMER_GROUP ??
    "notification-service-knowledge-group",
}));
