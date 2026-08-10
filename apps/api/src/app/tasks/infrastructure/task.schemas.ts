import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { TaskStatus } from '@project-ql/api-contracts';
import { HydratedDocument, Types } from 'mongoose';
import { BASE_SCHEMA_OPTIONS } from '../../core/database/schema-options';

const TASK_STATUSES: TaskStatus[] = ['todo', 'in_progress', 'done'];

@Schema({ ...BASE_SCHEMA_OPTIONS, collection: 'tasks' })
export class TaskEntity {
  @Prop({ required: true, type: Types.ObjectId, index: true })
  projectId!: Types.ObjectId;

  @Prop({ required: true, min: 1, max: 5 })
  step!: number;

  @Prop({ required: true, trim: true, minlength: 2, maxlength: 160 })
  name!: string;

  @Prop({ required: true, trim: true, minlength: 2, maxlength: 80 })
  department!: string;

  @Prop({ type: Date })
  plannedStartDate?: Date;

  @Prop({ type: Date })
  plannedEndDate?: Date;

  @Prop({ type: Date })
  actualEndDate?: Date;

  @Prop({
    required: true,
    type: String,
    enum: TASK_STATUSES,
    default: 'todo',
    index: true,
  })
  status!: TaskStatus;

  @Prop({ required: true, type: Types.ObjectId })
  createdBy!: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId })
  updatedBy!: Types.ObjectId;

  createdAt!: Date;
  updatedAt!: Date;
}

export type TaskDocument = HydratedDocument<TaskEntity>;
export const TaskSchema = SchemaFactory.createForClass(TaskEntity);
TaskSchema.index({ projectId: 1, step: 1 }, { unique: true });
TaskSchema.index({ projectId: 1, status: 1, step: 1 });
TaskSchema.index({ status: 1, plannedEndDate: 1 });
