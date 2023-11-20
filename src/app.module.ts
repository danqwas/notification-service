import { Module } from '@nestjs/common'
import { ScheduleModule } from '@nestjs/schedule'
import { NotificationModule } from './notification/notification.module'
import { TypeOrmModule } from '@nestjs/typeorm'
import { EmailModule } from './email/email.module'
import { ConfigModule } from '@nestjs/config'
import { ServeStaticModule } from '@nestjs/serve-static'
import { join } from 'path'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      serveRoot: '/static', // Optional: You can specify a different root URL if needed
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
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      serveRoot: '/static', // Optional: You can specify a different root URL if needed
    }),
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
