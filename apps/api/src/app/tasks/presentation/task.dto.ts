import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { TaskStatus } from '@project-ql/api-contracts';

const TASK_STATUSES: TaskStatus[] = ['todo', 'in_progress', 'done'];
const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class ListTasksQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 50, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 50;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @ApiPropertyOptional({ enum: TASK_STATUSES })
  @IsOptional()
  @IsEnum(TASK_STATUSES)
  status?: TaskStatus;
}

export class UpdateTaskDto {
  @ApiPropertyOptional({ maxLength: 80 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  department?: string;

  @ApiPropertyOptional({ example: '2026-08-10', nullable: true })
  @IsOptional()
  @IsISO8601({ strict: true })
  plannedStartDate?: string | null;

  @ApiPropertyOptional({ example: '2026-08-20', nullable: true })
  @IsOptional()
  @IsISO8601({ strict: true })
  plannedEndDate?: string | null;

  @ApiPropertyOptional({ example: '2026-08-19', nullable: true })
  @IsOptional()
  @IsISO8601({ strict: true })
  actualEndDate?: string | null;

  @ApiPropertyOptional({ enum: TASK_STATUSES })
  @IsOptional()
  @IsEnum(TASK_STATUSES)
  status?: TaskStatus;
}

export class TaskIdParamDto {
  @ApiProperty()
  @IsMongoId()
  taskId!: string;
}

export class TaskProjectIdParamDto {
  @ApiProperty()
  @IsMongoId()
  projectId!: string;
}
