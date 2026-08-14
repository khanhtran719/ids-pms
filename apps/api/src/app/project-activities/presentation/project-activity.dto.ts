import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class ProjectActivityProjectIdParamDto {
  @ApiProperty()
  @IsMongoId()
  projectId!: string;
}

export class ListProjectActivitiesQueryDto {
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
}

export class CreateProjectCommentDto {
  @ApiProperty({ maxLength: 2_000 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(2_000)
  content!: string;
}
