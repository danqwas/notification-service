import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity({ name: 'usuario' })
export class Usuario {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  usuario: string

  @Column()
  nombres: string

  @Column()
  dni: string

  @Column()
  tipo_usuario: string
}
