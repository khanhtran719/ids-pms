import { Transform, Type } from 'class-transformer';
import { IsEnum, IsInt, IsISO8601, IsMongoId, IsNotEmpty, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { CarrierPaymentCycle, CarrierServiceType } from '@project-ql/api-contracts';
const SERVICES: CarrierServiceType[] = ['teldata', 'ibs'];
const CYCLES: CarrierPaymentCycle[] = ['monthly', 'quarterly', 'semi_annual', 'annual', 'one_time'];
const trim = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value;
export class ListCarrierContractsQueryDto {
  @ApiPropertyOptional({ default: 1 }) @Type(() => Number) @IsInt() @Min(1) page = 1;
  @ApiPropertyOptional({ default: 20, maximum: 100 }) @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @ApiPropertyOptional({ maxLength: 80 }) @Transform(trim) @IsOptional() @IsString() @MaxLength(80) carrier?: string;
  @ApiPropertyOptional({ enum: SERVICES }) @IsOptional() @IsEnum(SERVICES) serviceType?: CarrierServiceType;
}
export class CreateCarrierContractDto {
  @ApiProperty() @IsMongoId() projectId!: string;
  @ApiProperty({ maxLength: 80 }) @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(80) carrier!: string;
  @ApiProperty({ enum: SERVICES }) @IsEnum(SERVICES) serviceType!: CarrierServiceType;
  @ApiProperty({ minimum: 0 }) @Type(() => Number) @IsNumber() @Min(0) quantity!: number;
  @ApiPropertyOptional({ minimum: 0 }) @IsOptional() @Type(() => Number) @IsNumber() @Min(0) unitPrice?: number;
  @ApiPropertyOptional({ enum: CYCLES }) @IsOptional() @IsEnum(CYCLES) paymentCycle?: CarrierPaymentCycle;
  @ApiPropertyOptional() @IsOptional() @IsISO8601({ strict: true }) startDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsISO8601({ strict: true }) endDate?: string;
}
export class UpdateCarrierContractDto {
  @ApiPropertyOptional({ maxLength: 80 }) @Transform(trim) @IsOptional() @IsString() @IsNotEmpty() @MaxLength(80) carrier?: string;
  @ApiPropertyOptional({ enum: SERVICES }) @IsOptional() @IsEnum(SERVICES) serviceType?: CarrierServiceType;
  @ApiPropertyOptional({ minimum: 0 }) @IsOptional() @Type(() => Number) @IsNumber() @Min(0) quantity?: number;
  @ApiPropertyOptional({ minimum: 0, nullable: true }) @IsOptional() @Type(() => Number) @IsNumber() @Min(0) unitPrice?: number | null;
  @ApiPropertyOptional({ enum: CYCLES, nullable: true }) @IsOptional() @IsEnum(CYCLES) paymentCycle?: CarrierPaymentCycle | null;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsISO8601({ strict: true }) startDate?: string | null;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsISO8601({ strict: true }) endDate?: string | null;
}
export class CarrierContractIdParamDto { @ApiProperty() @IsMongoId() contractId!: string; }
