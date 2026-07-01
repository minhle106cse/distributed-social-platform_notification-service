import { z } from "zod";

export const getNotificationsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  unreadOnly: z
    .string()
    .optional()
    .transform((v) => v === "true"),
});

export type GetNotificationsQuery = z.infer<typeof getNotificationsSchema>;
