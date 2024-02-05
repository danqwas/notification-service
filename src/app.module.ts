import {
  Global,
  Module,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EmailModule } from './email/email.module';
import { Pago } from './notification/entities/pago.entity';
import { Usuario } from './notification/entities/usuario.entity';
import { NotificationModule } from './notification/notification.module';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),

    TypeOrmModule.forRoot({
      name: 'payments',
      type: 'mysql',
      host: process.env.HOST,
      username: process.env.USERNAMEDB,
      password: process.env.PASSWORD,
      database: process.env.DATABASE,
      entities: [Pago],
    }),

    TypeOrmModule.forRoot({
      name: 'procesos',
      type: 'mysql',
      host: process.env.HOST,
      username: process.env.USERNAMEDB,
      password: process.env.PASSWORD,
      database: process.env.DATABASE,
      entities: [Pago],
    }),
    TypeOrmModule.forRoot({
      name: 'users',
      type: 'mysql',
      host: process.env.HOST2,
      username: process.env.USERNAMEDB2,
      password: process.env.PASSWORD2,
      database: process.env.DATABASE2,
      entities: [Usuario],
    }),
    NotificationModule,
    EmailModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}

/* TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.HOST,
      port: +process.env.PORT,
      database: process.env.DATABASE,
      username: process.env.USERNAMEDB,
      password: process.env.PASSWORD,
    }),
     */
