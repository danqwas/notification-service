import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm' // Importa TypeOrmModule
import { NotificationService } from './notification.service'
import { Pago } from './entities/pago.entity'
import { EmailModule } from 'src/email/email.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([Pago]),
    EmailModule, // Importa tus entidades aquí si es necesario
  ],
  providers: [NotificationService],
  exports: [NotificationService, TypeOrmModule],
})
export class NotificationModule {}
