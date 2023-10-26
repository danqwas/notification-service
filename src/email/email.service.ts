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
    const PASSWORD = this.configService.get<string>('PASSWORDEMAIL')
    const user = this.configService.get<string>('USERTRANSPORT')
    const from = this.configService.get<string>('FROMTRANSPORT')
    const port = this.configService.get<string>('PORTTRANSPORT')

    const transporter = nodemailer.createTransport({
      host: 'smtp.office365.com',
      port: port,
      auth: { user: user, pass: PASSWORD },
      secureConnection: true,
      tls: { ciphers: 'SSLv3' },
    })
    for (const result of results) {
      let typed = ''
      const tipoUnidad = result.tipo_unidad.toLowerCase()

      if (tipoUnidad.includes('estacionamiento')) {
        typed = 'estacionamiento'
      }
      if (tipoUnidad.includes('areas comunes')) {
        typed = 'areas comunes'
      }
      if (tipoUnidad.includes('departamento')) {
        typed = 'departamento'
      }
      if (tipoUnidad.includes('depósito')) {
        typed = 'deposito'
      }
      const nombresCliente = result.nombres_cliente
      const capitalizedNombresCliente = nombresCliente.toLowerCase().split(' ')
      console.log(capitalizedNombresCliente)
      for (let i = 0; i < capitalizedNombresCliente.length; i++) {
        capitalizedNombresCliente[i] =
          capitalizedNombresCliente[i][0].toUpperCase() +
          capitalizedNombresCliente[i].substr(1)
      }

      const html = `<!DOCTYPE html>
<html>
  <head>
    <title>Recordatorio de Pago</title>
  </head>
  <body>
    <p>¡Hola, ${capitalizedNombresCliente.join(' ')}!</p>
    <p>Te enviamos este mensaje para recordarte tu próxima cuota: ${typed} ${
      result.nombre
    } - ${result.nombre_proyecto} se vencerá en los próximos 7 días.</p>
    <p>Si ya has realizado el pago, por favor haz caso omiso al mensaje.</p>
    <p>Gracias por confiar en nosotros.</p>
    <img src="https://attachments.office.net/owa/dechegaray%40madridinmobiliaria.pe/service.svc/s/GetAttachmentThumbnail?id=AAMkADAzMzIxMjE0LWM5ZDAtNDZkMi1hNDRiLTg4ZmMwY2M5NjNjYwBGAAAAAAADxLigW0iaRojxFg4VULTKBwDLNFdhZ3QbTo2MsEHBYPykAAAAAAEMAADLNFdhZ3QbTo2MsEHBYPykAAAiGgR%2FAAABEgAQACHbmzg5JbZMl%2FnKKH1hg8U%3D&thumbnailType=2&token=eyJhbGciOiJSUzI1NiIsImtpZCI6IjczRkI5QkJFRjYzNjc4RDRGN0U4NEI0NDBCQUJCMTJBMzM5RDlGOTgiLCJ0eXAiOiJKV1QiLCJ4NXQiOiJjX3VidnZZMmVOVDM2RXRFQzZ1eEtqT2RuNWcifQ.eyJvcmlnaW4iOiJodHRwczovL291dGxvb2sub2ZmaWNlLmNvbSIsInVjIjoiOGIyMWQzNzE2ZmQxNGI3MjhhYTI5N2M3MzI4NTY0MWEiLCJzaWduaW5fc3RhdGUiOiJbXCJrbXNpXCJdIiwidmVyIjoiRXhjaGFuZ2UuQ2FsbGJhY2suVjEiLCJhcHBjdHhzZW5kZXIiOiJPd2FEb3dubG9hZEA0ZTE4NGRmMy1iMjY2LTQxY2EtYjg2Yi0zNWE4MDNkMTJiNjQiLCJpc3NyaW5nIjoiV1ciLCJhcHBjdHgiOiJ7XCJtc2V4Y2hwcm90XCI6XCJvd2FcIixcInB1aWRcIjpcIjExNTM4MDExMjYzMDg5NzQ3NDlcIixcInNjb3BlXCI6XCJPd2FEb3dubG9hZFwiLFwib2lkXCI6XCJjOTQzYjM1ZS1kNmMyLTQ4YjUtYWEyNy1mNmQ3ZTdlMDI5NjJcIixcInByaW1hcnlzaWRcIjpcIlMtMS01LTIxLTE5NDQyNzI1MC0zNjU4NjYxMjI2LTEwMDYzMDc0NjAtMzE2Nzc0OTJcIn0iLCJuYmYiOjE2OTc4MzYyMzcsImV4cCI6MTY5NzgzNjgzNywiaXNzIjoiMDAwMDAwMDItMDAwMC0wZmYxLWNlMDAtMDAwMDAwMDAwMDAwQDRlMTg0ZGYzLWIyNjYtNDFjYS1iODZiLTM1YTgwM2QxMmI2NCIsImF1ZCI6IjAwMDAwMDAyLTAwMDAtMGZmMS1jZTAwLTAwMDAwMDAwMDAwMC9hdHRhY2htZW50cy5vZmZpY2UubmV0QDRlMTg0ZGYzLWIyNjYtNDFjYS1iODZiLTM1YTgwM2QxMmI2NCIsImhhcHAiOiJvd2EifQ.QP3D_gcsSJZnpNEj5cshjBesmPKegSiSXPZwYCkybFo2qiDRj3fo4z8HaiM2wuyEL8TnJcpgs3kZUgR-UJQf6xhOQZCJATnmaq46xSfaUidHs1QaUnldBJsba_443_0EZwxx1RUm-UO_j7iJ5itha7HoBxyBslvGLwniodTw7eGSpMTJho0O0lALQzwzKZAa6wA1ZE2MqGbsgHn6IPs45f22hzV3xVdIzOQCNe96oaKTil4QJg8iNLZrGFcThRfCf-CsnSP8sRudOmHSWaUSkEaCdr16Siuj-dZ03Rw9OK90mVzRTvkllF-g6tWtfR2JYRWwnRjUrSLqfJGCFA26wQ&X-OWA-CANARY=Ay4y_xn9eUeFBjfdTmi04eCA_gGx0dsYCxFN0dfCE8_y3wDH6GpEY95-V6go3pQxWnlwhFzTQ9w.&owa=outlook.office.com&scriptVer=20231013005.11&animation=true" style="display: block; margin-top: 20px; max-width: 50%; margin-left: auto; margin-right: auto;" />
  </body>
</html>
`

      const mailOptions = {
        from: from,
        to: 'dechegaray@madridinmobiliaria.pe',
        subject: `recordatorio de pago -  ${typed} ${result.nombre} - ${result.nombre_proyecto}`,
        html: html,
      }

      try {
        const info = await transporter.sendMail(mailOptions)
        console.log(info)
        this.logger.debug('Correo enviado: %s', info.messageId)
        this.logger.debug('Message sent to: %s', result.email)
      } catch (error) {
        this.logger.error('Error al enviar el correo: %s', error)
      }
    }
  }
}
