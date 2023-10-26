import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { EmailService } from 'src/email/email.service'
import { EntityManager } from 'typeorm'

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name)

  constructor(
    private readonly entityManager: EntityManager,
    private readonly emailService: EmailService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_1AM) // La expresión cron para ejecutar a la 1 AM todos los días
  async generateNotifications() {
    // Realizar una consulta SQL personalizada en la tabla sin clave primaria
    try {
      const results = await this.entityManager
        .createQueryBuilder()
        .select('pa.*, u.nombre,u.estado_comercial, u.tipo_unidad, cli.email')
        .from('pagos', 'pa')
        .leftJoin('unidades', 'u', 'pa.codigo_proforma = u.codigo_proforma')
        .leftJoin('clientes', 'cli', 'cli.documento = pa.documento_cliente')
        .where('pa.fecha_vcto = DATE_ADD(CURDATE(), INTERVAL 7 DAY)')
        .andWhere('fecha_pago IS NULL')
        .andWhere('pa.codigo_proforma = u.codigo_proforma')
        .andWhere('pa.documento_cliente = cli.documento')
        .getRawMany()

      await this.emailService.sendEmail(results)
      this.logger.debug('Called every day at 1 AM')
    } catch (error) {
      console.error('Error al ejecutar la consulta SQL:', error)
    }
  }
}
