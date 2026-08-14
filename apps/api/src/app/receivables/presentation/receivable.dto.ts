import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsISO8601,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import type { ReceivableStatusFilter } from '@project-ql/api-contracts';

const STATUSES: ReceivableStatusFilter[] = [
  'unpaid',
  'partial',
  'paid',
  'overdue',
];
const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class ListReceivablesQueryDto {
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

  @ApiPropertyOptional({ maxLength: 160 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(160)
  search?: string;

  @ApiPropertyOptional({ enum: STATUSES })
  @IsOptional()
  @IsEnum(STATUSES)
  status?: ReceivableStatusFilter;

  @ApiPropertyOptional({ maxLength: 80 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(80)
  carrier?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  projectId?: string;
}

export class CreateReceivableDto {
  @ApiProperty()
  @IsMongoId()
  carrierContractId!: string;

  @ApiProperty({ maxLength: 80, example: 'Q3/2026' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  periodLabel!: string;

  @ApiProperty({ minimum: 0.01 })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amountDue!: number;

  @ApiPropertyOptional({ minimum: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amountPaid?: number;

  @ApiProperty({ example: '2026-08-31' })
  @IsISO8601({ strict: true })
  dueDate!: string;

  @ApiPropertyOptional({ example: '2026-08-20' })
  @IsOptional()
  @IsISO8601({ strict: true })
  paidDate?: string;

  @ApiPropertyOptional({ maxLength: 1_000 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(1_000)
  note?: string;
}

export class UpdateReceivableDto {
  @ApiPropertyOptional({ maxLength: 80 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  periodLabel?: string;

  @ApiPropertyOptional({ minimum: 0.01 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amountDue?: number;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amountPaid?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601({ strict: true })
  dueDate?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsISO8601({ strict: true })
  paidDate?: string | null;

  @ApiPropertyOptional({ nullable: true, maxLength: 1_000 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(1_000)
  note?: string | null;
}

export class ReceivableIdParamDto {
  @ApiProperty()
  @IsMongoId()
  receivableId!: string;
}
