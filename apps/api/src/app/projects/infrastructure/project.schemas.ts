import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type {
  ProjectMembershipRole,
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
