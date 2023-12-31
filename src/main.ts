import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { Logger } from '@nestjs/common'

async function bootstrap() {
  const logger = new Logger('bootstrap')
  const app = await NestFactory.create(AppModule)
  await app.listen(process.env.PORTBACKEND || 3001)
  logger.log('Application is running on: ' + process.env.PORTBACKEND)
}
bootstrap()
