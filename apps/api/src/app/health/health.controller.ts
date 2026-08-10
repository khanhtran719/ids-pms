import { Controller, Get } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller('v1/health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Get API and database availability' })
  @ApiOkResponse({ description: 'Current application health status' })
  getStatus() {
    return this.healthService.getStatus();
  }

  @Get('live')
  @ApiOperation({ summary: 'Check whether the API process is alive' })
  @ApiOkResponse({ description: 'The API process is alive' })
  getLiveness() {
    return this.healthService.getLiveness();
  }

  @Get('ready')
  @ApiOperation({ summary: 'Check whether the API can serve database traffic' })
  @ApiOkResponse({ description: 'The API and database are ready' })
  @ApiServiceUnavailableResponse({
    description: 'A required service is unavailable',
  })
  getReadiness() {
    return this.healthService.getReadiness();
  }
}
