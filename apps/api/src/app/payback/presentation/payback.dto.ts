import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { PaybackStatus } from '@project-ql/api-contracts';

const PAYBACK_STATUSES: PaybackStatus[] = ['paid_back', 'not_paid_back'];
const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class ListPaybackQueryDto {
  @ApiProperty({ example: 2025, minimum: 2000, maximum: 2100 })
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  fiscalYear!: number;

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

  @ApiPropertyOptional({ enum: PAYBACK_STATUSES })
  @IsOptional()
  @IsEnum(PAYBACK_STATUSES)
  status?: PaybackStatus;

  @ApiPropertyOptional({ maxLength: 160 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(160)
  search?: string;
}
