import { Module } from '@nestjs/common'
import { ScheduleModule } from '@nestjs/schedule'
import { NotificationModule } from './notification/notification.module'
import { TypeOrmModule } from '@nestjs/typeorm'
import { EmailModule } from './email/email.module'
import { ConfigModule } from '@nestjs/config'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    NotificationModule,
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.HOST,
      port: +process.env.PORT,
      username: process.env.USERNAMEDB,
      password: process.env.PASSWORD,
      database: process.env.DATABASE,
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
    }),
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
