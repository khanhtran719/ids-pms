import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type {
  ProjectMembershipRole,
  ProjectStatus,
} from '@project-ql/api-contracts';

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

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class ListProjectsQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @ApiPropertyOptional({ enum: PROJECT_STATUSES })
  @IsOptional()
  @IsEnum(PROJECT_STATUSES)
  status?: ProjectStatus;
}

export class CreateProjectDto {
  @ApiProperty({ example: 'IDS-PMS', minLength: 2, maxLength: 24 })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @MinLength(2)
  @MaxLength(24)
  @Matches(/^[A-Z0-9][A-Z0-9_-]*$/)
  code!: string;

  @ApiProperty({ minLength: 2, maxLength: 160 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(160)
  name!: string;

  @ApiPropertyOptional({ maxLength: 2_000 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  description?: string;

  @ApiPropertyOptional({ enum: PROJECT_STATUSES, default: 'planning' })
  @IsOptional()
  @IsEnum(PROJECT_STATUSES)
  status?: ProjectStatus;

  @ApiPropertyOptional({ example: '2026-08-10' })
  @IsOptional()
  @IsISO8601({ strict: true })
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-09-10' })
  @IsOptional()
  @IsISO8601({ strict: true })
  dueDate?: string;
}

export class UpdateProjectDto {
  @ApiPropertyOptional({ minLength: 2, maxLength: 160 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(160)
  name?: string;

  @ApiPropertyOptional({ maxLength: 2_000 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  description?: string;

  @ApiPropertyOptional({ enum: PROJECT_STATUSES })
  @IsOptional()
  @IsEnum(PROJECT_STATUSES)
  status?: ProjectStatus;

  @ApiPropertyOptional({ example: '2026-08-10', nullable: true })
  @IsOptional()
  @IsISO8601({ strict: true })
  startDate?: string | null;

  @ApiPropertyOptional({ example: '2026-09-10', nullable: true })
  @IsOptional()
  @IsISO8601({ strict: true })
  dueDate?: string | null;
}

export class UpsertProjectMemberDto {
  @ApiProperty()
  @IsMongoId()
  userId!: string;

  @ApiProperty({ enum: MEMBERSHIP_ROLES })
  @IsEnum(MEMBERSHIP_ROLES)
  role!: ProjectMembershipRole;
}

export class ListProjectMemberCandidatesQueryDto {
  @ApiPropertyOptional({ maxLength: 100 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 50 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 20;
}

export class ProjectIdParamDto {
  @ApiProperty()
  @IsMongoId()
  projectId!: string;
}

export class ProjectMemberParamDto extends ProjectIdParamDto {
  @ApiProperty()
  @IsMongoId()
  userId!: string;
}
