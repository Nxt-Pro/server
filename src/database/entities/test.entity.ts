import { Column, Entity } from 'typeorm';
import { BaseEntity } from '.';

@Entity('test')
export class TestEntity extends BaseEntity {
  @Column('varchar', { length: 50 })
  name: string;

  @Column('integer')
  age: number;

  @Column('boolean', { default: true })
  isActive: boolean;
}
