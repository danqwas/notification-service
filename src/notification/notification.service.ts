import { EmailService } from 'src/email/email.service';
import { Repository } from 'typeorm';

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';

import { Pago } from './entities/pago.entity';
import { Usuario } from './entities/usuario.entity';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(Pago, 'payments')
    private readonly paymentsRepo: Repository<Pago>,

    @InjectRepository(Usuario, 'users')
    private readonly usersRepo: Repository<Usuario>,
    private readonly emailService: EmailService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async generateFiveDayUserNotifications() {
    try {
      const results = await this.paymentsRepo
        .createQueryBuilder('pa')
        .select([
          'distinct pa.*',
          'u.nombre AS nombre_unidad',
          'u.estado_comercial',
          'u.tipo_unidad',
          'u.nombre_subdivision',
          'cli.email',
          'cli.telefono',
          'pro.username as username_creador',
        ])
        .leftJoin('unidades', 'u', 'pa.codigo_proforma = u.codigo_proforma')
        .leftJoin('clientes', 'cli', 'pa.documento_cliente = cli.documento')
        .leftJoin('procesos', 'pro', 'pa.codigo_proforma = pro.codigo_proforma')
        .where(`pa.fecha_vcto = DATE_ADD(Curdate(), INTERVAL 5 DAY)`)
        .andWhere('pa.fecha_pago IS NULL')
        .andWhere('pa.codigo_proforma = u.codigo_proforma')
        .andWhere('pa.documento_cliente = cli.documento')
        .andWhere('pa.codigo_proforma = pro.codigo_proforma')
        .getRawMany();

      if (results.length === 0) {
        console.log('no hay pagos');
      }
      const data = await this.emailService.sendEmail(
        results,
        'recordatorio de pago en 5 dias',
      );

      this.logger.debug('Called every day at 8 AM', { data });
    } catch (error) {
      console.error('Error al ejecutar la consulta SQL:', error);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async generateNotificationsTheSameDay() {
    try {
      const results = await this.paymentsRepo
        .createQueryBuilder('pa')
        .select([
          'distinct pa.*',
          'u.nombre AS nombre_unidad',
          'u.estado_comercial',
          'u.tipo_unidad',
          'u.nombre_subdivision',
          'cli.email',
          'cli.telefono',
          'pro.username as username_creador',
        ])
        .leftJoin('unidades', 'u', 'pa.codigo_proforma = u.codigo_proforma')
        .leftJoin('clientes', 'cli', 'pa.documento_cliente = cli.documento')
        .leftJoin('procesos', 'pro', 'pa.codigo_proforma = pro.codigo_proforma')
        .where(`pa.fecha_vcto =  CURDATE()`)
        .andWhere('pa.fecha_pago IS NULL')
        .andWhere('pa.codigo_proforma = u.codigo_proforma')
        .andWhere('pa.documento_cliente = cli.documento')
        .andWhere('pa.codigo_proforma = pro.codigo_proforma')
        .getRawMany();

      if (results.length === 0) {
        console.log('no hay pagos');
      }

      const data = await this.emailService.sendEmail(
        results,
        'recordatorio de pago el mismo dia',
      );
      const madridUsers = await this.obtenerUsuariosMadrid();

      await this.emailService.sendEmailToMadridUsers(madridUsers, results);

      this.logger.debug('Called every day at 8 AM', { data });
    } catch (error) {
      console.error('Error al ejecutar la consulta SQL:', error);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async getUIFromMadrid() {
    const todayDate = new Date().toISOString().split('T')[0];
    // - 30 days
    const before30Days = new Date();
    before30Days.setDate(before30Days.getDate() - 30);
    let arrayFinal = [];
    try {
      const query = `    SELECT DISTINCT
      a.codigo_proforma,
      a.codigo_unidad,
      a.nombres_cliente,
      a.apellidos_cliente,
      a.documento_cliente,
      a.codigo_unidades_asignadas,
      a.precio_venta,
      (SELECT pais FROM clientes cli WHERE cli.documento = a.documento_cliente) as pais,
      (SELECT nacionalidad FROM clientes cli WHERE cli.documento = a.documento_cliente) as nacionalidad,
      (SELECT valor FROM datos_extras d WHERE documento_cliente = a.documento_cliente AND nombre = 'trabajo') as ocupacion,
      (SELECT valor FROM datos_extras d WHERE documento_cliente = a.documento_cliente AND nombre = 'pep') AS pep,
      (SELECT fecha_pago FROM sperantmi.pagos where codigo_proforma = a.codigo_proforma and fecha_pago is not null and fecha_pago between ${todayDate} and ${todayDate} order by fecha_pago asc limit 1) as fecha_primer_abono,
      (SELECT valor FROM datos_extras d WHERE documento_cliente = a.documento_cliente AND nombre = 'origen_de_fondos') AS origen_de_fondos,
      (SELECT valor FROM datos_extras d WHERE documento_cliente = a.documento_cliente AND nombre = 'canales_de_atencion') AS canales_de_atencion,
      (SELECT valor FROM datos_extras d WHERE documento_cliente = a.documento_cliente AND nombre = 'lugar_de_procedencia_del_cliente') AS lugar_de_procedencia_del_cliente,
      (SELECT valor FROM datos_extras d WHERE documento_cliente = a.documento_cliente AND nombre = 'medio_de_pago_utilizado') AS medio_de_pago_utilizado,
      (SELECT valor FROM datos_extras d WHERE documento_cliente = a.documento_cliente AND nombre = 'estado_de_residencia') AS estado_de_residencia,
      (SELECT valor FROM datos_extras d WHERE documento_cliente = a.documento_cliente AND nombre = 'otras__propiedades_inmobiliarias') AS otras__propiedades_inmobiliarias,
      (SELECT valor FROM datos_extras d WHERE documento_cliente = a.documento_cliente AND nombre = 'zona_geografica') AS zona_geografica,
      
      a.tipo_financiamiento,
      a.situacion_legal
  FROM procesos a
        WHERE  a.codigo_proforma IN (SELECT codigo_proforma FROM procesos WHERE nombre = 'Separacion' and estado = 'Activo' )
          AND EXISTS (
            SELECT 1
            FROM pagos b
            JOIN (
              SELECT documento_cliente, MIN(fecha_pago) AS min_fecha_abono
              FROM pagos
              GROUP BY documento_cliente
            ) AS min_abonos
            ON min_abonos.documento_cliente = b.documento_cliente
            WHERE b.documento_cliente = a.documento_cliente
            AND min_abonos.min_fecha_abono BETWEEN ${before30Days} and ${todayDate}
            LIMIT 1
          ) 
        ORDER BY a.codigo_proforma DESC;`;

      const results = await this.paymentsRepo.query(query);
      console.log(results);

      for (const result of results) {
        let pep = '';
        const pepSQL = `SELECT valor FROM datos_extras d WHERE codigo_proforma = ${result.codigo_proforma} AND nombre = 'pep'`;
        const responseSubQuery = await this.paymentsRepo.query(pepSQL);
        if (responseSubQuery.length > 0) {
          pep = result[0].valor;
        } else {
          pep = null;
        }
        if (!pep) {
          result.pep = '';
        } else {
          result.pep = pep;
        }
      }
      for (const result of results) {
        const jsData = {
          codigo_proforma: result.codigo_proforma || '',
          codigo_unidad: result.codigo_unidad || '',
          nombres_cliente: result.nombres_cliente || '',
          apellidos_cliente: result.apellidos_cliente || '',
          pais_residencia: result.pais || '',
          nacionalidad: result.nacionalidad || '',
          ocupacion: result.ocupacion || '',
          documento_cliente: result.documento_cliente || '',
          pep: result.pep || '',
          codigo_unidades_asignadas: result.codigo_unidades_asignadas || '',
          fecha_abono: result.fecha_primer_abono || '',
          tipo_titular: 'Titular',
          origen_de_fondos: result.origen_de_fondos || '',
          canales_de_atencion: result.canales_de_atencion || '',
          lugar_de_procedencia_del_cliente:
            result.lugar_de_procedencia_del_cliente || '',
          medio_de_pago_utilizado: result.medio_de_pago_utilizado || '',
          estado_de_residencia: result.estado_de_residencia || '',
          otras__propiedades_inmobiliarias:
            result.otras__propiedades_inmobiliarias || '',
          zona_geografica: result.zona_geografica || '',
          tipo_financiamiento: result.tipo_financiamiento || '',
          precio_venta: result.precio_venta || '',
        };
        arrayFinal.push(jsData);
        let conyuguecleanResult = [];
        const sql1 = `select * from titulares where codigo_proforma = ${result.codigo_proforma} ;`;
        const responseSubQuery2 = await this.paymentsRepo.query(sql1);
        if (responseSubQuery2.length > 0) {
          conyuguecleanResult = responseSubQuery2;
        }
        let conyugueCleanResult2 = [];
        const sql2 = `  SELECT DISTINCT
        a.nombres,
        a.apellidos,
        a.documento,
        a.pais,
        a.nacionalidad,
        a.ocupacion,
        (SELECT (valor) FROM datos_extras d WHERE documento_cliente = a.documento AND nombre = 'origen_de_fondos') as origen_de_fondos,
        (SELECT (valor) FROM datos_extras d WHERE documento_cliente = a.documento AND nombre = 'canales_de_atencion') as canales_de_atencion,
        (SELECT (valor) FROM datos_extras d WHERE documento_cliente = a.documento AND nombre = 'lugar_de_procedencia_del_cliente') as lugar_de_procedencia_del_cliente,
        (SELECT (valor) FROM datos_extras d WHERE documento_cliente = a.documento AND nombre = 'medio_de_pago_utilizado') as medio_de_pago_utilizado,
        (SELECT (valor) FROM datos_extras d WHERE documento_cliente = a.documento AND nombre = 'estado_de_residencia') as estado_de_residencia,
        (SELECT (valor) FROM datos_extras d WHERE documento_cliente = a.documento AND nombre = 'otras__propiedades_inmobiliarias') as otras__propiedades_inmobiliarias,
        (SELECT (valor) FROM datos_extras d WHERE documento_cliente = a.documento AND nombre = 'zona_geografica') as zona_geografica,
        (SELECT valor FROM datos_extras d WHERE documento_cliente = a.documento AND nombre = 'pep') AS pep,
        a.tipo_financiamiento
      FROM clientes a
          WHERE a.documento = ${conyuguecleanResult[0].documento_pareja};`;
        const responseSubQuery3 = await this.paymentsRepo.query(sql2);
        if (responseSubQuery3.length > 0) {
          conyugueCleanResult2 = responseSubQuery3;
        }
        for (const row2 of conyugueCleanResult2) {
          arrayFinal.push({
            codigo_proforma: result.codigo_proforma || '',
            codigo_unidad: jsData.codigo_unidad,
            nombres_cliente: row2.nombres || '',
            apellidos_cliente: row2.apellidos || '',
            pais_residencia: row2.pais || '',
            nacionalidad: row2.nacionalidad || '',
            ocupacion: row2.ocupacion || '',
            documento_cliente: row2.documento || '',
            pep: row2.pep || '',
            codigo_unidades_asignadas: result.codigo_unidades_asignadas || '',
            fecha_abono: result.fecha_primer_abono || '',
            tipo_titular: 'Conyugue',
            origen_de_fondos: row2.origen_de_fondos || '',
            canales_de_atencion: row2.canales_de_atencion || '',
            lugar_de_procedencia_del_cliente:
              row2.lugar_de_procedencia_del_cliente || '',
            medio_de_pago_utilizado: row2.medio_de_pago_utilizado || '',
            estado_de_residencia: row2.estado_de_residencia || '',
            otras__propiedades_inmobiliarias:
              row2.otras__propiedades_inmobiliarias || '',
            zona_geografica: row2.zona_geografica || '',
            tipo_financiamiento: row2.tipo_financiamiento || '',
            precio_venta: result.precio_venta || '',
          });
        }
      }
      const information = await this.getInformationMySql();

      await Promise.all([arrayFinal, information]);
      console.log(arrayFinal);
      const prom = await this.getPromedios(arrayFinal, information);
      await Promise.resolve(prom);
      this.emailService.notifyUIFromMadrid(prom);
    } catch (error) {
      console.error(error);
    }
  }
  @Cron(CronExpression.EVERY_DAY_AT_1PM)
  async notifyBirthdays() {
    const query = `SELECT nombres, apellidos, denominacion, email
    FROM clientes
    WHERE MONTH(fecha_nacimiento) = MONTH(CURDATE())
      AND DAY(fecha_nacimiento) = DAY(CURDATE());
    `;
    const query2 = `SELECT * FROM ming_desarrollo.correos_omitidos;`;
    const results = await this.paymentsRepo.query(query);
    const results2 = await this.usersRepo.query(query2);
    console.log(
      '🚀 ~ NotificationService ~ notifyBirthdays ~ results:',
      results,
    );

    await this.emailService.sendBirthdayEmailMessage(results, results2);
    console.log('did it');
  }
  // the cron execute this function every last day of month 0 0 0 L * *
  @Cron(CronExpression.EVERY_30_SECONDS)
  async notifyWaterLightAndOthers() {
    const query = `SELECT  u.codigo_proforma, cli.*
    FROM sperantmi.unidades u
inner join titulares ti on ti.codigo_proforma=  u.codigo_proforma
inner join clientes cli on cli.documento = ti.documento_titular
    WHERE u.codigo_proyecto IN ('SSCLII', 'SSCLIII')
      AND u.estado_comercial = 'entregado'
      AND u.tipo_unidad in('departamento flat','departamento duplex','departamento simple','departamento penthouse')
      AND u.fecha_entrega >= DATE_SUB(CURDATE(), INTERVAL 2 YEAR);`;
    const results = await this.paymentsRepo.query(query);
    console.log(
      '🚀 ~ NotificationService ~ notifyWaterLightAndOthers ~ results:',
      results.length,
    );
    this.emailService.sendWaterLightAndOthers(results);
  }
  async getPromedios(arrayFinal: any[], information: any) {
    const averages = [];
    // Iterate through js and information arrays
    for (const jsValue of arrayFinal) {
      // De information obtener el origen_de_fondos y compararlo con el jsValue.origen_de_fondos y si lo hay obtener el nivel_de_risk
      const riskScoreCLient = this.calculateRisk(jsValue, information);
      Promise.resolve(riskScoreCLient);
      averages.push(riskScoreCLient);
    }

    return averages;
  }
  async calculateRisk(value, information) {
    let riskScoreCLient = 0;
    // Example validation and scoring logic
    const origenDeFondos = value.origen_de_fondos;
    let origenValor = 0;
    const tipo_de_financiamiento = value.tipo_financiamiento;
    let tipo_financiamientoValor = 0;
    const estadoDeResidencia = value.estado_de_residencia;
    let estadoResidenciaValor = 0;

    const otras__propiedades_inmobiliarias =
      value.otras__propiedades_inmobiliarias;
    let otrasPropiedadesInmobiliariasValor = 0;

    const lugar_de_procedencia_del_cliente =
      value.lugar_de_procedencia_del_cliente;
    let lugarProcedenciaDelClienteValor = 0;

    const pais_residencia = value.pais_residencia;
    let paisResidenciaValor = 0;
    let nacionalidad = value.nacionalidad;
    let nacionalidadValor = 0;
    const ocupacion = value.ocupacion;
    let ocupacionValor = 0;
    const pep = value.pep;
    let pepValor = 0;
    Promise.resolve();

    const paisResidenciaPrefijo = information.pais_residencia.find(
      (element) => {
        if (element.prefijo === pais_residencia) {
          return element;
        } else {
          return null;
        }
      },
    );
    if (paisResidenciaPrefijo) {
      // primero obtenemos el objeto que coincide con el prefijo
      paisResidenciaValor = Number(paisResidenciaPrefijo.nivel_riesgo);
      riskScoreCLient += paisResidenciaValor;
    }
    const nacionalidadPrefijo = information.nacionalidad.find((element) => {
      if (element.en_ingles === nacionalidad) {
        nacionalidad = element.nacionalidad;
        return element;
      } else {
        return null;
      }
    });
    if (nacionalidadPrefijo) {
      // primero obtenemos el objeto que coincide con el prefijo
      nacionalidadValor = Number(nacionalidadPrefijo.nivel_riesgo);
      riskScoreCLient += nacionalidadValor;
    }
    const ocupacionPrefijo = information.ocupacion.find((element) => {
      if (element.ocupacion === ocupacion) {
        return element;
      } else {
        return null;
      }
    });
    if (ocupacionPrefijo) {
      // primero obtenemos el objeto que coincide con el prefijo
      ocupacionValor = Number(ocupacionPrefijo.nivel_riesgo);
      riskScoreCLient += ocupacionValor;
    }

    const pepPrefijo = information.pep.find((element) => {
      if (element.es_pep === pep) {
        return element;
      } else {
        return null;
      }
    });
    if (pepPrefijo) {
      // primero obtenemos el objeto que coincide con el prefijo
      pepValor = Number(pepPrefijo.nivel_riesgo);
      riskScoreCLient += pepValor;
    }
    // origenDeFondos
    if (
      origenDeFondos === 'Por la venta o alquiler de bien inmueble' ||
      origenDeFondos === 'Herencia' ||
      origenDeFondos === 'Crédito hipotecario' ||
      origenDeFondos === 'Liquidación de BBSS' ||
      origenDeFondos === 'Ingresos por trabajo dependiente'
    ) {
      riskScoreCLient += 1;
      origenValor = 1;
      // High risk score
    } else if (
      origenDeFondos === 'Ingresos por trabajo independiente' ||
      origenDeFondos ===
        'Ganancias o utilidades de la empresa o negocio (accionista o persona jurídica)'
    ) {
      riskScoreCLient += 2;
      origenValor = 2; // Medium risk score
    } else if (
      origenDeFondos === 'Donación' ||
      origenDeFondos === 'Préstamo familiar' ||
      origenDeFondos === 'Fondos de terceros' ||
      origenDeFondos === 'Sorteos'
    ) {
      riskScoreCLient = 3; // Low risk score
      origenValor = 3;
    }
    // tipo_de_financiamiento
    if (
      tipo_de_financiamiento ===
        information.tipo_de_financiamiento[0].tipo_de_financiamiento ||
      tipo_de_financiamiento === 'Credito hipotecario'
    ) {
      riskScoreCLient += 1;
      tipo_financiamientoValor = 1;
    } else if (
      tipo_de_financiamiento ===
        information.tipo_de_financiamiento[1].tipo_de_financiamiento ||
      tipo_de_financiamiento === 'Financiamiento Directo MI' ||
      tipo_de_financiamiento === 'financiamiento directo mi'
    ) {
      riskScoreCLient += 2;
      tipo_financiamientoValor = 2;
    } else if (
      tipo_de_financiamiento ===
        information.tipo_de_financiamiento[2].tipo_de_financiamiento ||
      tipo_de_financiamiento === 'contado' ||
      tipo_de_financiamiento === 'Contado'
    ) {
      riskScoreCLient += 3;
      tipo_financiamientoValor = 3;
    }

    if (
      estadoDeResidencia ===
      'Peruano que vive en el país en los últimos 05 años'
    ) {
      riskScoreCLient += 1;
      estadoResidenciaValor = 1;
    } else if (
      estadoDeResidencia ===
        'Peruano que no ha vivido en los últimos 05 años en el país' ||
      estadoDeResidencia === 'Extranjero con CE residente del país'
    ) {
      riskScoreCLient += 2;
      estadoResidenciaValor = 2;
    } else if (
      estadoDeResidencia ===
        'Extranjero con pasaporte u otro tipo de documento y no domiciliado en el país' ||
      estadoDeResidencia === 'Peruano no domiciliado en el país'
    ) {
      riskScoreCLient += 3;
      estadoResidenciaValor = 3;
    }

    // otras__propiedades_inmobiliarias
    if (
      otras__propiedades_inmobiliarias === 'Sin propiedades inmuebles propias'
    ) {
      riskScoreCLient += 1;
      otrasPropiedadesInmobiliariasValor = 1;
    } else if (
      otras__propiedades_inmobiliarias ===
      'Compra de 01 inmueble en los últimos 05 años'
    ) {
      riskScoreCLient += 2;
      otrasPropiedadesInmobiliariasValor = 2;
    } else if (
      otras__propiedades_inmobiliarias ===
      'Compra de más de 02 inmuebles en los últimos 05 años'
    ) {
      riskScoreCLient += 3;
      otrasPropiedadesInmobiliariasValor = 3;
    }
    // lugar_de_procedencia_del_cliente

    if (
      lugar_de_procedencia_del_cliente ===
        'Zonas urbanas cerca al proyecto inmobiliario' ||
      lugar_de_procedencia_del_cliente ===
        'Zonas de los demás departamentos del país excepto: Lambayeque, Ucayali, Ayacucho, Huancavelica, Apurimac)'
    ) {
      riskScoreCLient += 1;
      lugarProcedenciaDelClienteValor = 1;
    } else if (
      lugar_de_procedencia_del_cliente ===
      'Zonas de los demás departamentos de Lambayeque, Ucayali, Ayacucho, Huancavelica, Apurimac)'
    ) {
      riskScoreCLient += 2;
      lugarProcedenciaDelClienteValor = 2;
    } else if (
      lugar_de_procedencia_del_cliente ===
      'Zonas donde hay precedentes de delitos LA/FT (Puno, Madre de Dios)'
    ) {
      riskScoreCLient += 3;
      lugarProcedenciaDelClienteValor = 3;
    }

    let promedio = riskScoreCLient / 9; // 9
    // Factor Productos y servicios
    let riskScoreCLient2 = 0;
    const canales_de_atencion = value.canales_de_atencion;
    let canalesDeAtencionValor = 0;
    const medio_de_pago = value.medio_de_pago_utilizado;
    let medioDePagoValor = 0;
    // Add more criteria and scoring logic as needed

    if (
      canales_de_atencion ===
      information.canales_de_atencion[0].canales_de_atencion
    ) {
      riskScoreCLient2 += 1;
      canalesDeAtencionValor = 1;
    } else if (
      canales_de_atencion ===
      information.canales_de_atencion[1].canales_de_atencion
    ) {
      riskScoreCLient2 += 3;
      canalesDeAtencionValor = 3;
    }

    if (medio_de_pago === information.medio_de_pago[0].medio_de_pago) {
      riskScoreCLient2 += 1;
      medioDePagoValor = 1;
    } else if (medio_de_pago === information.medio_de_pago[1].medio_de_pago) {
      riskScoreCLient2 += 2;
      medioDePagoValor = 2;
    } else if (
      medio_de_pago === information.medio_de_pago[2].medio_de_pago ||
      medio_de_pago === information.medio_de_pago[3].medio_de_pago
    ) {
      riskScoreCLient2 += 3;
      medioDePagoValor = 3;
    }
    const promedio2 = riskScoreCLient2 / 2;
    // Factor zona geografica
    let riskScoreCLient3 = 0;
    const zona_geografica = value.zona_geografica;
    let zonaGeograficaValor = 0;

    if (
      zona_geografica ===
      information.lugar_ubicado_proyecto[0].lugar_ubicado_proyecto
    ) {
      riskScoreCLient3 += 1;
      zonaGeograficaValor = 1;
    } else if (
      zona_geografica ===
      information.lugar_ubicado_proyecto[1].lugar_ubicado_proyecto
    ) {
      riskScoreCLient3 += 2;
      zonaGeograficaValor = 2;
    } else if (
      zona_geografica ===
      information.lugar_ubicado_proyecto[2].lugar_ubicado_proyecto
    ) {
      riskScoreCLient3 += 3;
      zonaGeograficaValor = 3;
    }
    const promedio3 = riskScoreCLient3 / 1;
    const promedioFinal = (promedio + promedio2 + promedio3) / 3;
    Promise.resolve(promedioFinal);

    return {
      ...value,
      nacionalidad,
      paisResidenciaValor,
      nacionalidadValor,
      ocupacionValor,
      pepValor,
      origenValor,
      tipo_financiamientoValor,
      estadoResidenciaValor,
      otrasPropiedadesInmobiliariasValor,
      lugarProcedenciaDelClienteValor,
      canalesDeAtencionValor,
      medioDePagoValor,
      zonaGeograficaValor,
      promedioFinal: promedioFinal.toFixed(2),
      promedio2,
      promedio3,
      promedio,
    };
  }

  async obtenerUsuariosMadrid() {
    try {
      // SELECT distinct us.nombres, us.correo, us.usuario, us.activo FROM ming_desarrollo.usuario us;
      // the table name is ming_desarrollo.usuario
      return await this.usersRepo
        .createQueryBuilder()
        .select(['distinct nombres', 'correo', 'usuario', 'activo'])
        .where('activo = 0')
        .getRawMany();
    } catch (error) {
      console.error(error);
    }
  }
  async getInformationMySql() {
    try {
      const information: { [key: string]: any } = {};
      const sqlQueries = {
        origen_de_fondos: 'SELECT * FROM origen_de_fondos;',
        canales_de_atencion: 'SELECT * FROM canales_de_atencion;',
        lugar_procedencia_cliente: 'SELECT * FROM lugar_procedencia_cliente;',
        medio_de_pago: 'SELECT * FROM medio_de_pago;',
        estado_residencia: 'SELECT * FROM estado_residencia;',
        otras_propiedades_inmobiliarias:
          'SELECT * FROM otras_propiedades_inmobiliarias;',
        lugar_ubicado_proyecto: 'SELECT * FROM lugar_ubicado_proyecto;',
        tipo_de_financiamiento: 'SELECT * FROM tipo_de_financiamiento;',
        ocupacion: 'SELECT * FROM ocupacion;',
        pais_residencia: 'SELECT * FROM pais_residencia;',
        nacionalidad: 'SELECT * FROM nacionalidad;',
        pep: 'SELECT * FROM pep;',
      };

      for (const [queryName, sql] of Object.entries(sqlQueries)) {
        const result = await this.usersRepo.query(sql);
        information[queryName] = result;
      }
      return information;
    } catch (error) {
      console.error('Error in getInformationMySql:', error);
      throw error;
    }
  }
}
