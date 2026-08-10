import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type {
  ProjectMembershipRole,
  ProjectOperationalStatus,
  ProjectDataSource,
  ProjectStatus,
} from '@project-ql/api-contracts';
import { HydratedDocument, Types } from 'mongoose';
import { BASE_SCHEMA_OPTIONS } from '../../core/database/schema-options';

const PROJECT_STATUSES: ProjectStatus[] = [
  'planning',
  'active',
  'on_hold',
  'completed',
  'archived',
];
const MEMBERSHIP_ROLES: ProjectMembershipRole[] = [
  'owner',
  'manager',
  'member',
];
const PROJECT_OPERATIONAL_STATUSES: ProjectOperationalStatus[] = [
  'not_started',
  'in_progress',
  'partial',
  'operational',
];
const PROJECT_DATA_SOURCES: ProjectDataSource[] = [
  'Teldata',
  'IBS',
  'DoanhThu',
];

@Schema({ ...BASE_SCHEMA_OPTIONS, collection: 'projects' })
export class ProjectEntity {
  @Prop({
    required: true,
    unique: true,
    index: true,
    trim: true,
    uppercase: true,
  })
  code!: string;

  @Prop({ required: true, trim: true, minlength: 2, maxlength: 160 })
  name!: string;

  @Prop({ trim: true, maxlength: 2_000 })
  description?: string;

  @Prop({
    required: true,
    type: String,
    enum: PROJECT_STATUSES,
    default: 'planning',
    index: true,
  })
  status!: ProjectStatus;

  @Prop({
    required: true,
    type: String,
    enum: PROJECT_OPERATIONAL_STATUSES,
    default: 'not_started',
    index: true,
  })
  operationalStatus!: ProjectOperationalStatus;

  @Prop({ type: Date })
  signedDate?: Date;

  @Prop({ trim: true, maxlength: 500 })
  address?: string;

  @Prop({ trim: true, maxlength: 100 })
  province?: string;

  @Prop({ trim: true, maxlength: 240 })
  investor?: string;

  @Prop({ trim: true, maxlength: 160 })
  projectType?: string;

  @Prop({ trim: true, maxlength: 2_000 })
  scaleDescription?: string;

  @Prop({ type: Number, min: 0 })
  unitCount?: number;

  @Prop({ type: Number, min: 0 })
  floorAreaM2?: number;

  @Prop({ type: Number, min: 0 })
  landAreaHa?: number;

  @Prop({ trim: true, maxlength: 160 })
  investmentUnit?: string;

  @Prop({
    type: [String],
    enum: PROJECT_DATA_SOURCES,
    default: [],
  })
  dataSources!: ProjectDataSource[];

  @Prop({ type: Boolean, default: false, index: true })
  dataConflict!: boolean;

  @Prop({ type: Number, min: 0, default: 0 })
  carrierContractCount!: number;

  @Prop({ type: Number, min: 0 })
  revenueTotal?: number;

  @Prop({ type: Number, min: 0 })
  costTotal?: number;

  @Prop({ type: Number, min: 0 })
  capex?: number;

  @Prop({ type: Date })
  startDate?: Date;

  @Prop({ type: Date })
  dueDate?: Date;

  @Prop({ required: true, type: Types.ObjectId, index: true })
  createdBy!: Types.ObjectId;

  createdAt!: Date;
  updatedAt!: Date;
}

export type ProjectDocument = HydratedDocument<ProjectEntity>;
export const ProjectSchema = SchemaFactory.createForClass(ProjectEntity);
ProjectSchema.index({ status: 1, updatedAt: -1, _id: -1 });
ProjectSchema.index({ operationalStatus: 1, updatedAt: -1, _id: -1 });

@Schema({ ...BASE_SCHEMA_OPTIONS, collection: 'project_memberships' })
export class ProjectMembershipEntity {
  @Prop({ required: true, type: Types.ObjectId })
  projectId!: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId })
  userId!: Types.ObjectId;

  @Prop({ required: true, type: String, enum: MEMBERSHIP_ROLES })
  role!: ProjectMembershipRole;

  @Prop({ required: true, type: Types.ObjectId })
  createdBy!: Types.ObjectId;

  createdAt!: Date;
  updatedAt!: Date;
}

export type ProjectMembershipDocument =
  HydratedDocument<ProjectMembershipEntity>;
export const ProjectMembershipSchema = SchemaFactory.createForClass(
  ProjectMembershipEntity,
);
ProjectMembershipSchema.index({ projectId: 1, userId: 1 }, { unique: true });
ProjectMembershipSchema.index({ userId: 1, projectId: 1 });
ProjectMembershipSchema.index({ projectId: 1, role: 1 });
