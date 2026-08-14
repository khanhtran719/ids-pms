import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { FiscalQuarter } from '@project-ql/api-contracts';
import { HydratedDocument, Types } from 'mongoose';
import { BASE_SCHEMA_OPTIONS } from '../../core/database/schema-options';

@Schema({ ...BASE_SCHEMA_OPTIONS, collection: 'revenue_actuals' })
export class RevenueActualEntity {
  @Prop({ required: true, type: Types.ObjectId, index: true })
  projectId!: Types.ObjectId;

  @Prop({ required: true, type: Number, min: 2000, max: 2100, index: true })
  fiscalYear!: number;

  @Prop({ required: true, type: Number, enum: [1, 2, 3, 4] })
  quarter!: FiscalQuarter;

  @Prop({ required: true, type: Number, min: 0 })
  revenue!: number;

  @Prop({ required: true, type: Number, min: 0 })
  cost!: number;

  @Prop({ required: true, type: Types.ObjectId })
  createdBy!: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId })
  updatedBy!: Types.ObjectId;

  createdAt!: Date;
  updatedAt!: Date;
}

export type RevenueActualDocument = HydratedDocument<RevenueActualEntity>;
export const RevenueActualSchema =
  SchemaFactory.createForClass(RevenueActualEntity);
RevenueActualSchema.index(
  { projectId: 1, fiscalYear: 1, quarter: 1 },
  { unique: true },
);
RevenueActualSchema.index({ fiscalYear: 1, updatedAt: -1 });
