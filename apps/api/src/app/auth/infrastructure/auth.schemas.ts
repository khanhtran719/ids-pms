import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import type {
  PermissionCode,
  UserRoleCode,
  UserStatus,
} from '@project-ql/api-contracts';
import { BASE_SCHEMA_OPTIONS } from '../../core/database/schema-options';

const ROLE_CODES: UserRoleCode[] = ['admin', 'manager', 'member'];
const USER_STATUSES: UserStatus[] = ['active', 'disabled'];

@Schema({ ...BASE_SCHEMA_OPTIONS, collection: 'users' })
export class UserEntity {
  @Prop({
    required: true,
    unique: true,
    index: true,
    lowercase: true,
    trim: true,
  })
  email!: string;

  @Prop({ required: true, trim: true, minlength: 2, maxlength: 100 })
  displayName!: string;

  @Prop({ required: true, select: false })
  passwordHash!: string;

  @Prop({
    required: true,
    type: String,
    enum: USER_STATUSES,
    default: 'active',
    index: true,
  })
  status!: UserStatus;

  @Prop({
    required: true,
    type: [String],
    enum: ROLE_CODES,
    default: ['member'],
  })
  roleCodes!: UserRoleCode[];

  createdAt!: Date;
  updatedAt!: Date;
}

export type UserDocument = HydratedDocument<UserEntity>;
export const UserSchema = SchemaFactory.createForClass(UserEntity);

@Schema({ ...BASE_SCHEMA_OPTIONS, collection: 'roles' })
export class RoleEntity {
  @Prop({
    required: true,
    type: String,
    unique: true,
    index: true,
    enum: ROLE_CODES,
  })
  code!: UserRoleCode;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, type: [String], default: [] })
  permissions!: PermissionCode[];
}

export type RoleDocument = HydratedDocument<RoleEntity>;
export const RoleSchema = SchemaFactory.createForClass(RoleEntity);

@Schema({ ...BASE_SCHEMA_OPTIONS, collection: 'refresh_sessions' })
export class RefreshSessionEntity {
  @Prop({ required: true, type: Types.ObjectId, index: true })
  userId!: Types.ObjectId;

  @Prop({ required: true, unique: true, index: true })
  tokenHash!: string;

  @Prop({ required: true, index: { expires: 0 } })
  expiresAt!: Date;

  @Prop({ trim: true, maxlength: 256 })
  userAgent?: string;

  @Prop({ trim: true, maxlength: 64 })
  ipAddress?: string;
}

export type RefreshSessionDocument = HydratedDocument<RefreshSessionEntity>;
export const RefreshSessionSchema =
  SchemaFactory.createForClass(RefreshSessionEntity);
