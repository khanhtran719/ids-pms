import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { ProjectActivityType } from '@project-ql/api-contracts';
import { HydratedDocument, Types } from 'mongoose';
import { BASE_SCHEMA_OPTIONS } from '../../core/database/schema-options';

const PROJECT_ACTIVITY_TYPES: ProjectActivityType[] = ['comment'];

@Schema({ ...BASE_SCHEMA_OPTIONS, collection: 'project_activities' })
export class ProjectActivityEntity {
  @Prop({ required: true, type: Types.ObjectId, index: true })
  projectId!: Types.ObjectId;

  @Prop({ required: true, type: String, enum: PROJECT_ACTIVITY_TYPES })
  type!: ProjectActivityType;

  @Prop({ required: true, trim: true, minlength: 1, maxlength: 2_000 })
  content!: string;

  @Prop({ required: true, type: Types.ObjectId, index: true })
  authorId!: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: 160 })
  authorDisplayName!: string;

  @Prop({ required: true, trim: true, lowercase: true, maxlength: 320 })
  authorEmail!: string;

  createdAt!: Date;
  updatedAt!: Date;
}

export type ProjectActivityDocument = HydratedDocument<ProjectActivityEntity>;
export const ProjectActivitySchema = SchemaFactory.createForClass(
  ProjectActivityEntity,
);
ProjectActivitySchema.index({ projectId: 1, createdAt: -1, _id: -1 });
