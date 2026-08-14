import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type {
  OpportunityRegion,
  OpportunityStage,
} from '@project-ql/api-contracts';
import { HydratedDocument, Types } from 'mongoose';
import { BASE_SCHEMA_OPTIONS } from '../../core/database/schema-options';

const REGIONS: OpportunityRegion[] = ['north', 'central', 'south'];
const STAGES: OpportunityStage[] = [1, 2, 3, 4];

@Schema({ ...BASE_SCHEMA_OPTIONS, collection: 'opportunities' })
export class OpportunityEntity {
  @Prop({ required: true, trim: true, minlength: 2, maxlength: 200 })
  name!: string;

  @Prop({ required: true, type: String, enum: REGIONS, index: true })
  region!: OpportunityRegion;

  @Prop({ trim: true, maxlength: 100 }) province?: string;
  @Prop({ trim: true, maxlength: 200 }) investor?: string;
  @Prop({ trim: true, maxlength: 120 }) projectType?: string;
  @Prop({ trim: true, maxlength: 100, index: true }) ownerName?: string;

  @Prop({ required: true, type: Number, enum: STAGES, default: 1, index: true })
  stage!: OpportunityStage;

  @Prop({ min: 0 }) unitCount?: number;
  @Prop({ min: 0 }) floorAreaM2?: number;
  @Prop({ trim: true, maxlength: 2000 }) note?: string;
  @Prop({ required: true, default: false, index: true }) feasible!: boolean;
  @Prop({ type: Date, index: true }) lastInteractionDate?: Date;
  @Prop({ required: true, type: Types.ObjectId }) createdBy!: Types.ObjectId;
  @Prop({ required: true, type: Types.ObjectId }) updatedBy!: Types.ObjectId;
  createdAt!: Date;
  updatedAt!: Date;
}

export type OpportunityDocument = HydratedDocument<OpportunityEntity>;
export const OpportunitySchema =
  SchemaFactory.createForClass(OpportunityEntity);
OpportunitySchema.index({ stage: -1, lastInteractionDate: -1, _id: 1 });
OpportunitySchema.index({ region: 1, stage: -1, _id: 1 });
