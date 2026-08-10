import { Transform, Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsISO8601,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
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
  ProjectOperationalStatus,
  ProjectDataQualityFilter,
  ProjectDataSource,
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
const PROJECT_OPERATIONAL_STATUSES: ProjectOperationalStatus[] = [
  'not_started',
  'in_progress',
  'partial',
  'operational',
];
const PROJECT_DATA_QUALITY_FILTERS: ProjectDataQualityFilter[] = [
  'has_revenue',
  'missing_capex',
  'conflict',
];
const PROJECT_DATA_SOURCES: ProjectDataSource[] = [
  'Teldata',
  'IBS',
  'DoanhThu',
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

  @ApiPropertyOptional({ enum: PROJECT_OPERATIONAL_STATUSES })
  @IsOptional()
  @IsEnum(PROJECT_OPERATIONAL_STATUSES)
  operationalStatus?: ProjectOperationalStatus;

  @ApiPropertyOptional({ enum: PROJECT_DATA_QUALITY_FILTERS })
  @IsOptional()
  @IsEnum(PROJECT_DATA_QUALITY_FILTERS)
  dataQuality?: ProjectDataQualityFilter;

  @ApiPropertyOptional({ maxLength: 160 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(160)
  search?: string;
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

  @ApiPropertyOptional({
    enum: PROJECT_OPERATIONAL_STATUSES,
    default: 'not_started',
  })
  @IsOptional()
  @IsEnum(PROJECT_OPERATIONAL_STATUSES)
  operationalStatus?: ProjectOperationalStatus;

  @ApiPropertyOptional({ example: '2020-07-01' })
  @IsOptional()
  @IsISO8601({ strict: true })
  signedDate?: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({ maxLength: 100 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  province?: string;

  @ApiPropertyOptional({ maxLength: 240 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(240)
  investor?: string;

  @ApiPropertyOptional({ maxLength: 160 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(160)
  projectType?: string;

  @ApiPropertyOptional({ maxLength: 2_000 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  scaleDescription?: string;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitCount?: number;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  floorAreaM2?: number;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  landAreaHa?: number;

  @ApiPropertyOptional({ maxLength: 160 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(160)
  investmentUnit?: string;

  @ApiPropertyOptional({ enum: PROJECT_DATA_SOURCES, isArray: true })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsEnum(PROJECT_DATA_SOURCES, { each: true })
  dataSources?: ProjectDataSource[];

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  dataConflict?: boolean;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  carrierContractCount?: number;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  revenueTotal?: number;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  costTotal?: number;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  capex?: number;

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

  @ApiPropertyOptional({ enum: PROJECT_OPERATIONAL_STATUSES })
  @IsOptional()
  @IsEnum(PROJECT_OPERATIONAL_STATUSES)
  operationalStatus?: ProjectOperationalStatus;

  @ApiPropertyOptional({ example: '2020-07-01', nullable: true })
  @IsOptional()
  @IsISO8601({ strict: true })
  signedDate?: string | null;

  @ApiPropertyOptional({ maxLength: 500, nullable: true })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string | null;

  @ApiPropertyOptional({ maxLength: 100, nullable: true })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  province?: string | null;

  @ApiPropertyOptional({ maxLength: 240, nullable: true })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(240)
  investor?: string | null;

  @ApiPropertyOptional({ maxLength: 160, nullable: true })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(160)
  projectType?: string | null;

  @ApiPropertyOptional({ maxLength: 2_000, nullable: true })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  scaleDescription?: string | null;

  @ApiPropertyOptional({ minimum: 0, nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitCount?: number | null;

  @ApiPropertyOptional({ minimum: 0, nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  floorAreaM2?: number | null;

  @ApiPropertyOptional({ minimum: 0, nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  landAreaHa?: number | null;

  @ApiPropertyOptional({ maxLength: 160, nullable: true })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(160)
  investmentUnit?: string | null;

  @ApiPropertyOptional({
    enum: PROJECT_DATA_SOURCES,
    isArray: true,
    nullable: true,
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsEnum(PROJECT_DATA_SOURCES, { each: true })
  dataSources?: ProjectDataSource[] | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  dataConflict?: boolean;

  @ApiPropertyOptional({ minimum: 0, nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  carrierContractCount?: number | null;

  @ApiPropertyOptional({ minimum: 0, nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  revenueTotal?: number | null;

  @ApiPropertyOptional({ minimum: 0, nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  costTotal?: number | null;

  @ApiPropertyOptional({ minimum: 0, nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  capex?: number | null;

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
