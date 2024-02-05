import * as nodemailer from 'nodemailer';

import {
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface ClienteInfo {
  emaildelcliente: string;
  nombredelcliente: string;
  proyecto: string;
  torreSubDivision: string;
  nombre_unidad: string;
  tipo_unidad: string;
  nombre: string;
}

interface AsesorInfo {
  emaildelasesor: string;
}

interface MailOptions {
  from: string;
  to: string | string[];
  subject: string;
  html: string;
}
@Injectable()
export class EmailService {
  notifyUIFromMadrid(data: any[]) {
    if (data.length === 0) {
      console.log('no hay nada que reportar');
      return;
    }
    const element = data.filter((element) => {
      return element.promedioFinal >= 2;
    });
    if (element.length === 0) {
      console.log('no hay usuarios que notificar');
      return;
    }
    const html = this.generateHtmlToGerency(element);

    const mailOptions: MailOptions = {
      from: this.configService.get<string>('FROMTRANSPORT').trim(),
      to: [
        'zholguin@madridinmobiliaria.pe',
        'srodriguez@madridinmobiliaria.pe',
      ],
      subject: `Alerta de UIF`,
      html: html,
    };

    this.sendEmailWithRetry(this.createTransporter(), mailOptions, element);
  }
  capitalizeWords(input: string): string {
    return input.replace(/\b\w/g, (match) => match.toUpperCase());
  }

  generateHtmlToGerency(data: any[]) {
    const users = data.map((element) => {
      const nombres = this.capitalizeWords(
        element.nombres_cliente.toLowerCase().trim(),
      ); //Evert Antonio
      const apellidos = this.capitalizeWords(
        element.apellidos_cliente.toLowerCase().trim(),
      );
      // que la primera letra sea mayuscula de cada palabra

      return `<li>${nombres} ${apellidos} con codigo de proforma: ${element.codigo_proforma}</li>\n`;
    });
    // quitar comas

    //crear un array de objetos para el html de gerencia
    const html = `<!DOCTYPE html>
    <html>
      <head>
        <title>Aviso UIF</title>
      </head>
      <body>
        <h1>Alerta de UIF</h1>
        <p>¡Hola, Gerencia!</p>
        <p>
          Le enviamos este mensaje para avisarles que los usuarios se encuentran en zona de riego.
        </p>
        <p>
          Estos usuarios son los siguientes:
          <ul style="list-style-type: none;">
            ${users.join('')}
          </ul>
        </p>
        <p>
          Para más información
        </p>
        <a href="https://site.madridinmobiliaria.pe/#/reporte-uif" blank>Modulo de UIF</a>
      </body>
    </html>`;

    return html;
  }
  constructor(private configService: ConfigService) {}
  private readonly logger = new Logger(EmailService.name);

  async sendEmail(results: any[], subject: string) {
    if (results.length === 0) {
      return;
    }

    const PASSWORD = this.configService.get<string>('PASSWORDEMAIL').trim();
    const user = this.configService.get<string>('USERTRANSPORT').trim();
    const from = this.configService.get<string>('FROMTRANSPORT').trim();
    const port = this.configService.get<string>('PORTTRANSPORT').trim();

    const transporter = nodemailer.createTransport({
      host: 'smtp.office365.com',
      port: port,
      auth: { user: user, pass: PASSWORD },
      secureConnection: true,
      tls: { ciphers: 'SSLv3' },
    });

    for (const result of results) {
      const typed = this.getType(result.tipo_unidad);

      const torreSubDivision = result.nombre_subdivision
        ? '- ' + result.nombre_subdivision.toUpperCase().split(' ')[1]
        : '';

      const capitalizedNombresCliente = this.capitalizeNames(
        result.nombres_cliente,
      );

      const html = this.generateHtml(
        typed,
        result,
        torreSubDivision,
        capitalizedNombresCliente,
        subject,
      );

      const mailOptions = {
        from: from,
        to: result.email,
        subject: `recordatorio de pago -  ${typed} ${result.nombre_unidad}${torreSubDivision} - ${result.nombre_proyecto}`,
        html: html,
      };

      try {
        const info = await transporter.sendMail(mailOptions);

        this.logger.debug('Correo enviado: %s', info.messageId);
        this.logger.debug('Message sent to: %s', result.email);
      } catch (error) {
        this.logger.error('Error al enviar el correo: %s', error);
      }
    }
  }
  async sendWaterLightAndOthers(results: []) {
    this.logger.debug('there is nothing to send', results.length);
    if (results.length === 0) {
      return;
    }
    const transporter: nodemailer.Transporter = this.createTransporter();
    let subject = 'Aviso de luz y agua';
    const imagePath =
      'https://raw.githubusercontent.com/danqwas/notification-service/f60087cf391e7aa5c36e44c3bda34cb4539139bc/public/antencion_cliente.jpg';
    const html = `<!DOCTYPE html>
    <html lang="en">
    
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body {
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
    
            .email-container {
                max-width:  90%;
                margin: 20px auto;
                padding: 20px;
                border: 1px solid #333;
                border-radius: 15px;
            }
    
            h1 {
                color: #333;
            }
    
            p {
                color: #555;
            }
    
            img {
                display: block;
                margin: 20px auto;
                max-width: 100%;
            }
        </style>
        <title>Reminder Email</title>
    </head>
    
    <body>
    
        <div class="email-container">
            <h1>Estimado Propietario</h1>
            <p>El presente correo es para recordarle acerca del envío mensual de los recibos y vouchers de pago correspondientes a los servicios de agua, luz y gas de su departamento, en cumplimiento a lo dispuesto por el Fondo MiVivienda Verde.</p>
            <p>Agradecemos su colaboración. Quedamos atentos al envío.</p>
    
           
        </div>
            
    </body>
        <footer>
        <img src="${imagePath}" style="display: block; margin-top: 20px; max-width: 50%; margin-left: auto; margin-right: auto;" />
        </footer>
    </html>
    `;
    const mailOptions = {
      from: this.configService.get<string>('FROMTRANSPORT').trim(),
      to: ['daniel.echegaray.apac@outlook.com.pe'],
      subject: subject,
      html: html,
    };
    const info = await transporter.sendMail(mailOptions);
    this.logger.debug('Email sended: %s', info.messageId);
    this.logger.warn('this is a test');
  }
  async sendEmailToMadridUsers(madridUsers = [], results = []) {
    if (madridUsers.length === 0 || results.length === 0) {
      console.log('no hay usuarios');
      return;
    }
    const transporter = this.createTransporter();

    const arrayMadridUsers = {};
    let asesor = 'pcaceres';
    for (const result of results) {
      if (
        !arrayMadridUsers[result.username_creador] ||
        !arrayMadridUsers['pcaceres']
      ) {
        const madridUser = madridUsers.find(
          (madridUser) =>
            //  dechegaray@madridinmobiliaria.pe only get dechegaray

            madridUser.correo.toString().split('@')[0] ===
            result.username_creador,
        );
        if (!madridUser) {
          console.log('asesor no encontrado');
        }
        arrayMadridUsers[asesor] = [];
      }

      const clienteInfo = this.generateClienteInfo(result);

      /* const clienteExistente = arrayMadridUsers[asesor].find(
        (cliente) => cliente.emaildelcliente === clienteInfo.emaildelcliente,
      ) */
      arrayMadridUsers[asesor].push(clienteInfo);
    }

    this.processMadridUser(arrayMadridUsers, madridUsers);
    let asesorEmail = '';

    for (const asesor in arrayMadridUsers) {
      const clientes = arrayMadridUsers[asesor];
      asesorEmail = clientes[clientes.length - 1].emaildelasesor;
      // client = this.filterUniqueClients(clientes)
      const html = this.generateHtmlMadridUsers(clientes, asesorEmail);
      const mailOptions = {
        from: this.configService.get<string>('FROMTRANSPORT').trim(),
        to: asesorEmail,
        subject: `Recordatorio de pago de los clientes del asesor ${
          asesor !== '' ? asesor : 'Priscila Caceres'
        }`,
        html: html,
      };
      try {
        if (html) {
          await this.sendEmailWithRetry(transporter, mailOptions, {
            email: asesorEmail,
          });
        }
      } catch (error) {
        this.logger.error('Error al enviar el correo: %s', error);
      }
    }

  }
  private createTransporter(): nodemailer.Transporter {
    const PASSWORD = this.configService.get<string>('PASSWORDEMAIL').trim();
    const user = this.configService.get<string>('USERTRANSPORT').trim();

    const port = this.configService.get<string>('PORTTRANSPORT').trim();

    return nodemailer.createTransport({
      host: 'smtp.office365.com',
      port: port,
      auth: { user: user, pass: PASSWORD },
      secureConnection: true,
      tls: { ciphers: 'SSLv3' },
    });
  }

  private async sendEmailWithRetry(
    transporter: nodemailer.Transporter,
    mailOptions: MailOptions,
    result: any,
  ) {
    try {
      const info = await transporter.sendMail(mailOptions);
      this.logger.debug('Correo enviado: %s', info.messageId);
      this.logger.debug('Message sent to: %s', result.email);
    } catch (error) {
      this.logger.error('Error al enviar el correo: %s', error);
    }
  }
  async sendBirthdayEmailMessage(results: [], exceptionEmails: []) {
    console.log(
      '🚀 ~ EmailService ~ sendBirthdayEmailMessage ~ exceptionEmails:',
      exceptionEmails,
    );
    const PASSWORD = this.configService.get<string>('PASSWORDEMAIL').trim();
    const user = this.configService.get<string>('USERTRANSPORT').trim();
    const from = this.configService.get<string>('FROMTRANSPORT').trim();
    const port = this.configService.get<string>('PORTTRANSPORT').trim();

    const transporter = nodemailer.createTransport({
      host: 'smtp.office365.com',
      port: port,
      auth: { user: user, pass: PASSWORD },
      secureConnection: true,
      tls: { ciphers: 'SSLv3' },
    });
    for (const result of results) {
      const imageBirthday = `https://raw.githubusercontent.com/danqwas/notification-service/develop/public/feliz_cumpleanios_madrid_cliente.jpg`;
      // Convertir el objeto a una cadena JSON
      const jsonCliente = JSON.stringify(result);

      // Codificar en base64
      const base64Cliente = btoa(jsonCliente);
      const encodedParam = encodeURIComponent(base64Cliente);

      const html = `<!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
        <title>Recordatorio de Cumpleanios</title>
        
      </head>
      <body>
      <div style="text-align: center; margin: 0; padding: 0;">
  <img src="${imageBirthday}" alt="Imagen de cumpleaños" style="display: block; margin-top: 50px; max-width: 80%; margin-left: auto; margin-right: auto;">
  
</div>
        
        <footer>
        <div style="margin-top: 20px; font-size: 14px; background-color: #ffecb3; padding: 20px; border-top: 1px solid #ffcc80;">
        <a href="https://idyllic-begonia-704cba.netlify.app/desuscrito?token=${encodedParam}" target="_self" style="text-decoration: none; color: #1565c0; border: 1px solid #ffa726; border-radius: 8px; padding: 15px; text-align: center; max-width: 400px; margin: 0 auto; background-color: #fff8e1; display: inline-block;">
        Si no desea recibir estas notificaciones, por favor haz clic aquí
      </a>
      
        </div>
         
        </footer>
      </body>
      </html>`;

      const mailOptions = {
        from: from,
        to: 'daniel.echegaray.apac@outlook.com.pe',
        subject: `Feliz Cumpleaños ${
          this.capitalizeNames(result['nombres'])[0]
        }`,
        html: html,
      };

      console.log(
        "🚀 ~ EmailService ~ sendBirthdayEmailMessage ~ result['email']:",
        result['email'],
      );
      console.log(
        "🚀 ~ EmailService ~ sendBirthdayEmailMessage ~ result['email']:",
        exceptionEmails.some((item) => {
          return item['correos_omitidos'] === result['email'];
        }),
      );
      try {
        if (
          !exceptionEmails.some((item) => {
            return item['correos_omitidos'] === result['email'];
          })
        ) {
          const info = await transporter.sendMail(mailOptions);
          this.logger.debug('Correo enviado: %s', info.messageId);
        }
      } catch (error) {
        this.logger.error('An Error Ocurred While Sending Email: %s', error);
      }
    }
  }
  private generateClienteInfo(result: any): ClienteInfo {
    const torreSubDivision = result.nombre_subdivision
      ? '- ' + result.nombre_subdivision.toUpperCase().split(' ')[1]
      : '';
    return {
      emaildelcliente: result.email,
      nombredelcliente:
        this.capitalizeNames(result.nombres_cliente).join(' ') +
        ' ' +
        this.capitalizeNames(result.apellidos_cliente).join(' '),
      proyecto: result.nombre_proyecto,
      torreSubDivision: torreSubDivision,
      nombre_unidad: result.nombre_unidad,
      tipo_unidad: result.tipo_unidad,
      nombre: result.nombre,
    };
  }

  private generateAsesorInfo(element = {}): AsesorInfo {
    return Object.keys(element).length > 0
      ? { emaildelasesor: element['correo'] }
      : { emaildelasesor: 'pcaceres@madridinmobiliaria.pe' };
  }

  private filterUniqueClients(clientes: ClienteInfo[]): ClienteInfo[] {
    const uniqueClients: ClienteInfo[] = [];
    const clientNames: Set<string> = new Set();

    for (const cliente of clientes) {
      if (
        !clientNames.has(cliente.nombredelcliente) &&
        cliente.emaildelcliente !== undefined
      ) {
        clientNames.add(cliente.nombredelcliente);
        uniqueClients.push({
          emaildelcliente: cliente.emaildelcliente,
          nombredelcliente: cliente.nombredelcliente,
          proyecto: cliente.proyecto,
          torreSubDivision: cliente.torreSubDivision,
          nombre_unidad: cliente.nombre_unidad,
          tipo_unidad: cliente.tipo_unidad,
          nombre: cliente.nombre,
        });
      }
    }
    return uniqueClients;
  }
  private processMadridUser(arrayMadridUsers = {}, madridUsers = []) {
    for (const element in arrayMadridUsers) {
      const usuarioEncontrado = madridUsers.find(
        (asesor) =>
          asesor.usuario.toLowerCase().trim() === element.toLowerCase().trim(),
      );
      const correoMadridUser = this.generateAsesorInfo(usuarioEncontrado);
      if (correoMadridUser) {
        arrayMadridUsers[element].push(correoMadridUser);
      }
    }
  }

  private generateHtmlMadridUsers(client = [], asesorEmail = '') {
    if (client.length === 0) {
      console.log('No hay correos para enviar.');
      return;
    }

    if (asesorEmail === '') {
      asesorEmail = 'dechegaray@madridinmobiliaria.pe';
    }

    const userName = asesorEmail.split('@')[0];
    const groupedClients: { [key: string]: string[] } = {};
    client.forEach((c) => {
      if (c !== client[client.length - 1]) {
        const key = `${c.nombredelcliente}`;
        if (!groupedClients[key]) {
          groupedClients[key] = [];
        }
        groupedClients[key].push(
          `<li>${c.nombre} -> ${c.tipo_unidad} - ${
            c.nombre_unidad
          } del proyecto: ${c.proyecto}${
            c.torreSubDivision !== '' ? `/Torre ${c.torreSubDivision}` : ''
          }</li>`,
        );
      }
    });

    // Crear HTML con subtítulos para grupos de clientes
    const clientGroupsHtml = Object.entries(groupedClients)
      .map(([name, projects]) => `<p>${name}:<ul>${projects.join('')}</ul></p>`)
      .join('');
    const imagePath =
      'https://raw.githubusercontent.com/danqwas/notification-service/f60087cf391e7aa5c36e44c3bda34cb4539139bc/public/antencion_cliente.jpg';
    return `<!DOCTYPE html>
<html>
  <head>
    <title>Recordatorio de Pago de los clientes</title>
  </head>
  <body>
    <p>¡Hola, ${userName}!</p>
    <p>Le enviamos este mensaje para hacerle recordar que las personas: </p> 
     <ul>
       ${clientGroupsHtml}
     </ul><p> tienen que cancelar sus pagos hasta el día de hoy.</p>
    <p>No dude en contactarlos si tienen alguna duda y ayudarles a cancelar sus pagos.</p>
    <img src="${imagePath}" style="display: block; margin-top: 20px; max-width: 50%; margin-left: auto; margin-right: auto;" />
  </body>
</html>`;
  }

  private getType(tipoUnidad: string): string {
    if (tipoUnidad.includes('estacionamiento')) {
      return 'estacionamiento';
    }
    if (tipoUnidad.includes('areas comunes')) {
      return 'areas comunes';
    }
    if (tipoUnidad.includes('departamento')) {
      return 'departamento';
    }
    if (tipoUnidad.includes('depósito')) {
      return 'deposito';
    }
    return '';
  }

  private capitalizeNames(nombresCliente: string): string[] {
    const capitalizedNombresCliente = nombresCliente
      .trim()
      .toLowerCase()
      .split(' ');
    return capitalizedNombresCliente.map(
      (name) => name[0].toUpperCase() + name.slice(1),
    );
  }

  private generateHtml(
    typed: string,
    result: any,
    torreSubDivision: string,
    capitalizedNombresCliente: string[],
    subject: string,
  ): string {
    const imagePath =
      'https://raw.githubusercontent.com/danqwas/notification-service/f60087cf391e7aa5c36e44c3bda34cb4539139bc/public/antencion_cliente.jpg';
    return subject === 'recordatorio de pago en 5 dias'
      ? `<!DOCTYPE html>
  <html>
    <head>
      <title>Recordatorio de Pago</title>
    </head>
    <body>
      <p>¡Hola, ${capitalizedNombresCliente.join(' ')}!</p>
      <p>Le enviamos este mensaje para hacerle recordar su próxima cuota del ${typed}: ${
        result.nombre_unidad
      }${torreSubDivision} - ${result.nombre_proyecto} respecto a ${
        result.nombre
      } se vencerá en los próximos 5 días.</p>
      <p>Si ya has realizado el pago, por favor haz caso omiso al mensaje.</p>
      <p>Gracias por confiar en nosotros.</p>
      <img src="${imagePath}" style="display: block; margin-top: 20px; max-width: 50%; margin-left: auto; margin-right: auto;" />
    </body>
  </html>`
      : `<!DOCTYPE html>
  <html>
    <head>
    <title>Recordatorio de Pago</title>
    </head>
    <body>
      <p>¡Hola, ${capitalizedNombresCliente.join(' ')}!</p>
      <p>Le enviamos este mensaje para hacerle recordar su próxima cuota del ${typed}: ${
        result.nombre_unidad
      }${torreSubDivision} - ${result.nombre_proyecto} respecto a ${
        result.nombre
      } se vencerá este mismo día.</p>
      <p>Si ya has realizado el pago, por favor haz caso omiso al mensaje.</p>
      <p>Gracias por confiar en nosotros.</p>
      <img src="${imagePath}" style="display: block; margin-top: 20px; max-width: 50%; margin-left: auto; margin-right: auto;" />
    </body>
  </html> `;
  }
}
