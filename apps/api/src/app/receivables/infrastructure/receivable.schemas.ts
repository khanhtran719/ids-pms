import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BASE_SCHEMA_OPTIONS } from '../../core/database/schema-options';

@Schema({ ...BASE_SCHEMA_OPTIONS, collection: 'receivables' })
export class ReceivableEntity {
  @Prop({ required: true, type: Types.ObjectId, index: true })
  projectId!: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, index: true })
  carrierContractId!: Types.ObjectId;

  @Prop({ required: true, trim: true, minlength: 1, maxlength: 80 })
  periodLabel!: string;

  @Prop({ required: true, type: Number, min: 0.01 })
  amountDue!: number;

  @Prop({ required: true, type: Number, min: 0, default: 0 })
  amountPaid!: number;

  @Prop({ required: true, type: Date, index: true })
  dueDate!: Date;

  @Prop({ type: Date })
  paidDate?: Date;

  @Prop({ trim: true, maxlength: 1_000 })
  note?: string;

  @Prop({ required: true, type: Types.ObjectId })
  createdBy!: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId })
  updatedBy!: Types.ObjectId;

  createdAt!: Date;
  updatedAt!: Date;
}

export type ReceivableDocument = HydratedDocument<ReceivableEntity>;
export const ReceivableSchema = SchemaFactory.createForClass(ReceivableEntity);
ReceivableSchema.index({ projectId: 1, dueDate: 1, _id: 1 });
ReceivableSchema.index({ carrierContractId: 1, dueDate: 1, _id: 1 });
