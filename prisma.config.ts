import { config } from 'dotenv'
import { join } from 'path'
config({ path: join(process.cwd(), '../../.env') })
import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: { url: process.env.NOTIFICATION_DATABASE_URL! },
})
