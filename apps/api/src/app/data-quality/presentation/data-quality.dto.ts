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
import { ApiPropertyOptional } from '@nestjs/swagger';
import type { DataQualityIssueType } from '@project-ql/api-contracts';

const DATA_QUALITY_ISSUE_TYPES: DataQualityIssueType[] = [
  'data_conflict',
  'missing_capex',
  'missing_task_plan',
  'overdue_task',
  'missing_actual_end',
];
const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class ListDataQualityQueryDto {
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

  @ApiPropertyOptional({ enum: DATA_QUALITY_ISSUE_TYPES })
  @IsOptional()
  @IsEnum(DATA_QUALITY_ISSUE_TYPES)
  issueType?: DataQualityIssueType;

  @ApiPropertyOptional({ maxLength: 120 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;
}
