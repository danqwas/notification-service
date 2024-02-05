import { EmailModule } from 'src/email/email.module';

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Pago } from './entities/pago.entity';
import { Usuario } from './entities/usuario.entity';
import { NotificationService } from './notification.service';

// NotificationModule
@Module({
  imports: [
    TypeOrmModule.forFeature([Pago], 'payments'),
    TypeOrmModule.forFeature([Usuario], 'users'),
    TypeOrmModule.forFeature([Pago], 'procesos'),
    EmailModule,
  ],
  providers: [NotificationService],
  exports: [NotificationService, TypeOrmModule],
})
export class NotificationModule {}
