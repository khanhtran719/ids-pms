import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsISO8601,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type {
  OpportunityRegion,
  OpportunityStage,
} from '@project-ql/api-contracts';

const REGIONS: OpportunityRegion[] = ['north', 'central', 'south'];
const STAGES: OpportunityStage[] = [1, 2, 3, 4];
const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
const optionalBoolean = ({ value }: { value: unknown }) =>
  value === 'true' ? true : value === 'false' ? false : value;

export class ListOpportunitiesQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @ApiPropertyOptional({ maxLength: 160 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(160)
  search?: string;

  @ApiPropertyOptional({ enum: STAGES })
  @Type(() => Number)
  @IsOptional()
  @IsEnum(STAGES)
  stage?: OpportunityStage;

  @ApiPropertyOptional({ enum: REGIONS })
  @IsOptional()
  @IsEnum(REGIONS)
  region?: OpportunityRegion;

  @ApiPropertyOptional({ maxLength: 100 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  ownerName?: string;

  @ApiPropertyOptional({ type: Boolean })
  @Transform(optionalBoolean)
  @IsOptional()
  @IsBoolean()
  feasible?: boolean;
}

export class CreateOpportunityDto {
  @ApiProperty({ maxLength: 200 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @ApiProperty({ enum: REGIONS }) @IsEnum(REGIONS) region!: OpportunityRegion;
  @ApiProperty({ enum: STAGES })
  @Type(() => Number)
  @IsEnum(STAGES)
  stage!: OpportunityStage;

  @ApiPropertyOptional({ maxLength: 100 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  province?: string;

  @ApiPropertyOptional({ maxLength: 200 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  investor?: string;

  @ApiPropertyOptional({ maxLength: 120 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  projectType?: string;

  @ApiPropertyOptional({ maxLength: 100 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  ownerName?: string;

  @ApiPropertyOptional({ minimum: 0 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitCount?: number;

  @ApiPropertyOptional({ minimum: 0 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0)
  floorAreaM2?: number;

  @ApiPropertyOptional({ maxLength: 2000 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  note?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  feasible?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601({ strict: true })
  lastInteractionDate?: string;
}

export class UpdateOpportunityDto {
  @ApiPropertyOptional({ maxLength: 200 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ enum: REGIONS })
  @IsOptional()
  @IsEnum(REGIONS)
  region?: OpportunityRegion;

  @ApiPropertyOptional({ enum: STAGES })
  @Type(() => Number)
  @IsOptional()
  @IsEnum(STAGES)
  stage?: OpportunityStage;

  @ApiPropertyOptional({ maxLength: 100, nullable: true })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  province?: string | null;

  @ApiPropertyOptional({ maxLength: 200, nullable: true })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  investor?: string | null;

  @ApiPropertyOptional({ maxLength: 120, nullable: true })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  projectType?: string | null;

  @ApiPropertyOptional({ maxLength: 100, nullable: true })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  ownerName?: string | null;

  @ApiPropertyOptional({ minimum: 0, nullable: true })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitCount?: number | null;

  @ApiPropertyOptional({ minimum: 0, nullable: true })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0)
  floorAreaM2?: number | null;

  @ApiPropertyOptional({ maxLength: 2000, nullable: true })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  note?: string | null;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() feasible?: boolean;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsISO8601({ strict: true })
  lastInteractionDate?: string | null;
}

export class OpportunityIdParamDto {
  @ApiProperty() @IsMongoId() opportunityId!: string;
}
