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

  @Cron(CronExpression.EVERY_10_SECONDS) // La expresión cron para ejecutar a la hora de 8 AM todos los días
  async generateNotifications() {
    console.log('Called every 10 seconds')
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
      this.logger.debug('Called every day at 8 AM')
    } catch (error) {
      console.error('Error al ejecutar la consulta SQL:', error)
    }
  }
}
/* SELECT e137055050089a4456af861af305200.pa.*, u.nombre, u.estado_comercial, u.tipo_unidad, cli.email
FROM e137055050089a4456af861af305200.pagos pa
LEFT JOIN e137055050089a4456af861af305200.unidades u ON pa.codigo_proforma = u.codigo_proforma
LEFT JOIN e137055050089a4456af861af305200.clientes cli ON cli.documento = pa.documento_cliente
WHERE pa.fecha_vcto = CURRENT_DATE + INTERVAL '7 days'
  AND fecha_pago IS NULL
  AND pa.codigo_proforma = u.codigo_proforma
  AND pa.documento_cliente = cli.documento;
 */
