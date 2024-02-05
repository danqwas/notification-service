import { Column, Entity, PrimaryColumn } from 'typeorm'

@Entity({ name: 'pagos' })
export class Pago {
  @PrimaryColumn({ type: 'uuid', insert: false, select: false, update: false })
  identificador: never

  @Column()
  codigo_proyecto: string

  @Column()
  nombre_proyecto: string

  @Column()
  nombres_cliente: string

  @Column()
  apellidos_cliente: string

  @Column()
  documento_cliente: string

  @Column()
  codigo_proforma: string

  @Column()
  numero_contrato: string

  @Column()
  fecha_contrato: string

  @Column()
  tipo_cronograma: string

  @Column()
  nombre: string

  @Column()
  etiqueta: string

  @Column()
  moneda_venta: string

  @Column()
  fecha_vcto: string

  @Column()
  fecha_pago: string

  @Column()
  monto_programado: string

  @Column()
  monto_pagado: string

  @Column()
  saldo: string

  @Column()
  saldo_precio: string

  @Column()
  mora: string

  @Column()
  capital: string

  @Column()
  interes_compensatorio: string

  @Column()
  interes_inicial: string

  @Column()
  interes_diferido: string

  @Column()
  interes_vencido: string

  @Column()
  descuento: string

  @Column()
  ubicacion_anterior: string

  @Column()
  ubicacion: string

  @Column()
  estado: string

  @Column()
  fecha_nif: string

  @Column()
  estado_nif: string

  @Column()
  fecha_creacion: string

  @Column()
  usuario_creador: string

  @Column()
  observacion: string

  @Column()
  id: string

  @Column()
  tipo: string

  @Column()
  activo: string

  @Column()
  saldo_capital: string

  @Column()
  proceso: string

  @Column()
  proceso_id: string

  @Column()
  motivo_inactivo: string

  @Column()
  nuevo_interes_compensatorio: string

  @Column()
  nuevo_interes_inicial: string

  @Column()
  descuento_interes_inicial: string

  @Column()
  descuento_interes_diferido: string
}
