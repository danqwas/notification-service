import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as nodemailer from 'nodemailer'

@Injectable()
export class EmailService {
  constructor(private configService: ConfigService) {}
  private readonly logger = new Logger(EmailService.name)
  // private typed = ''
  async sendEmail(results: any[]) {
    if (results.length === 0) {
      return
    }

    const PASSWORD = this.configService.get<string>('PASSWORDEMAIL').trim()
    const user = this.configService.get<string>('USERTRANSPORT').trim()
    const from = this.configService.get<string>('FROMTRANSPORT').trim()
    const port = this.configService.get<string>('PORTTRANSPORT').trim()

    const transporter = nodemailer.createTransport({
      host: 'smtp.office365.com',
      port: port,
      auth: { user: user, pass: PASSWORD },
      secureConnection: true,
      tls: { ciphers: 'SSLv3' },
    })

    for (const result of results) {
      const typed = this.getType(result.tipo_unidad)

      const torreSubDivision = result.nombre_subdivision
        ? '-' + result.nombre_subdivision.toUpperCase().split(' ')[1]
        : ''

      const capitalizedNombresCliente = this.capitalizeNames(
        result.nombres_cliente,
      )

      const html = this.generateHtml(
        typed,
        result,
        torreSubDivision,
        capitalizedNombresCliente,
      )

      const mailOptions = {
        from: from,
        to: 'dechegaray@madridinmobiliaria.pe',
        subject: `recordatorio de pago -  ${typed} ${result.nombre}${torreSubDivision} - ${result.nombre_proyecto}`,
        html: html,
      }

      try {
        const info = await transporter.sendMail(mailOptions)

        this.logger.debug('Correo enviado: %s', info.messageId)
        this.logger.debug('Message sent to: %s', result.email)
      } catch (error) {
        this.logger.error('Error al enviar el correo: %s', error)
      }
    }
  }

  private getType(tipoUnidad: string): string {
    if (tipoUnidad.includes('estacionamiento')) {
      return 'estacionamiento'
    }
    if (tipoUnidad.includes('areas comunes')) {
      return 'areas comunes'
    }
    if (tipoUnidad.includes('departamento')) {
      return 'departamento'
    }
    if (tipoUnidad.includes('depósito')) {
      return 'deposito'
    }
    return ''
  }

  private capitalizeNames(nombresCliente: string): string[] {
    const capitalizedNombresCliente = nombresCliente.toLowerCase().split(' ')
    return capitalizedNombresCliente.map(
      (name) => name[0].toUpperCase() + name.slice(1),
    )
  }

  private generateHtml(
    typed: string,
    result: any,
    torreSubDivision: string,
    capitalizedNombresCliente: string[],
  ): string {
    const imagePath = '/public/antencion_cliente.jpg'
    return `<!DOCTYPE html>
  <html>
    <head>
      <title>Recordatorio de Pago</title>
    </head>
    <body>
      <p>¡Hola, ${capitalizedNombresCliente.join(' ')}!</p>
      <p>Le enviamos este mensaje para hacerle recordar su próxima cuota del ${typed}: ${
        result.nombre
      }${torreSubDivision} - ${
        result.nombre_proyecto
      } se vencerá en los próximos 7 días.</p>
      <p>Si ya has realizado el pago, por favor haz caso omiso al mensaje.</p>
      <p>Gracias por confiar en nosotros.</p>
      <img src="${imagePath}" style="display: block; margin-top: 20px; max-width: 50%; margin-left: auto; margin-right: auto;" />
    </body>
  </html>`
  }
}
