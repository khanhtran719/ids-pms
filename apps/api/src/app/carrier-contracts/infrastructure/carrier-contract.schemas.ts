import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { CarrierContractUnit, CarrierPaymentCycle, CarrierServiceType } from '@project-ql/api-contracts';
import { HydratedDocument, Types } from 'mongoose';
import { BASE_SCHEMA_OPTIONS } from '../../core/database/schema-options';

const SERVICES: CarrierServiceType[] = ['teldata', 'ibs'];
const UNITS: CarrierContractUnit[] = ['apartment', 'm2'];
const CYCLES: CarrierPaymentCycle[] = ['monthly', 'quarterly', 'semi_annual', 'annual', 'one_time'];

@Schema({ ...BASE_SCHEMA_OPTIONS, collection: 'carrier_contracts' })
export class CarrierContractEntity {
  @Prop({ required: true, type: Types.ObjectId, index: true }) projectId!: Types.ObjectId;
  @Prop({ required: true, trim: true, minlength: 2, maxlength: 80, index: true }) carrier!: string;
  @Prop({ required: true, type: String, enum: SERVICES, index: true }) serviceType!: CarrierServiceType;
  @Prop({ required: true, min: 0 }) quantity!: number;
  @Prop({ required: true, type: String, enum: UNITS }) unit!: CarrierContractUnit;
  @Prop({ min: 0 }) unitPrice?: number;
  @Prop({ type: String, enum: CYCLES }) paymentCycle?: CarrierPaymentCycle;
  @Prop({ type: Date }) startDate?: Date;
  @Prop({ type: Date }) endDate?: Date;
  @Prop({ required: true, type: Types.ObjectId }) createdBy!: Types.ObjectId;
  @Prop({ required: true, type: Types.ObjectId }) updatedBy!: Types.ObjectId;
  createdAt!: Date; updatedAt!: Date;
}
export type CarrierContractDocument = HydratedDocument<CarrierContractEntity>;
export const CarrierContractSchema = SchemaFactory.createForClass(CarrierContractEntity);
CarrierContractSchema.index({ projectId: 1, carrier: 1, serviceType: 1 });
CarrierContractSchema.index({ serviceType: 1, updatedAt: -1 });
