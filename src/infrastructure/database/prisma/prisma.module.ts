import { Global, Module } from '@nestjs/common'
import { TRANSACTION_MANAGER } from '@distributed-social-platform/shared-kernel'
import { PrismaService } from './prisma.service'
import { PrismaTransactionManager } from './prisma-transaction-manager'

@Global()
@Module({
  providers: [
    PrismaService,
    {
      provide: TRANSACTION_MANAGER,
      useClass: PrismaTransactionManager,
    },
  ],
  exports: [PrismaService, TRANSACTION_MANAGER],
})
export class PrismaModule {}
