import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import type { AuthSessionResponse } from '@project-ql/api-contracts';
import type { EnvironmentVariables } from '../../core/config/environment';
import { AuthenticationService } from '../application/authentication.service';
import { AccessTokenGuard } from './access-token.guard';
import type { AuthenticatedRequest } from './auth-request';
import { LoginDto } from './auth.dto';
import { CsrfProtectionGuard } from './csrf-protection.guard';

const REFRESH_COOKIE_NAME = 'ids_pms_refresh';

interface CookieRequest extends Request {
  cookies: Record<string, string | undefined>;
}

@ApiTags('authentication')
@Controller('v1/auth')
export class AuthController {
  constructor(
    private readonly authentication: AuthenticationService,
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CsrfProtectionGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiOkResponse({ description: 'Access token and current user' })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  async login(
    @Body() input: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthSessionResponse> {
    const result = await this.authentication.login({
      ...input,
      client: this.readClient(request),
    });
    this.setRefreshCookie(
      response,
      result.refreshToken,
      result.refreshTokenExpiresAt,
    );
    return {
      accessToken: result.accessToken,
      expiresInSeconds: result.expiresInSeconds,
      user: result.user,
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CsrfProtectionGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Rotate refresh session and issue an access token' })
  @ApiOkResponse({ description: 'New access token and current user' })
  async refresh(
    @Req() request: CookieRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthSessionResponse> {
    const refreshToken = request.cookies[REFRESH_COOKIE_NAME];
    if (!refreshToken) {
      throw new UnauthorizedException({
        code: 'INVALID_REFRESH_SESSION',
        message: 'Refresh session is invalid or expired',
      });
    }
    const result = await this.authentication.refresh(
      refreshToken,
      this.readClient(request),
    );
    this.setRefreshCookie(
      response,
      result.refreshToken,
      result.refreshTokenExpiresAt,
    );
    return {
      accessToken: result.accessToken,
      expiresInSeconds: result.expiresInSeconds,
      user: result.user,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(CsrfProtectionGuard)
  @ApiOperation({ summary: 'Revoke the current refresh session' })
  @ApiNoContentResponse()
  async logout(
    @Req() request: CookieRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.authentication.logout(request.cookies[REFRESH_COOKIE_NAME]);
    response.clearCookie(REFRESH_COOKIE_NAME, this.cookieOptions());
  }

  @Get('me')
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the current authenticated user' })
  @ApiOkResponse({ description: 'Current user and permissions' })
  getCurrentUser(@Req() request: AuthenticatedRequest) {
    return this.authentication.getCurrentUser(request.auth.subject);
  }

  private setRefreshCookie(
    response: Response,
    token: string,
    expires: Date,
  ): void {
    response.cookie(REFRESH_COOKIE_NAME, token, {
      ...this.cookieOptions(),
      expires,
    });
  }

  private cookieOptions() {
    return {
      httpOnly: true,
      secure: this.config.getOrThrow('AUTH_COOKIE_SECURE'),
      sameSite: 'strict' as const,
      path: '/api/v1/auth',
    };
  }

  private readClient(request: Request) {
    const rawUserAgent = request.headers['user-agent'];
    return {
      ipAddress: request.ip?.slice(0, 64),
      userAgent:
        typeof rawUserAgent === 'string'
          ? rawUserAgent.slice(0, 256)
          : undefined,
    };
  }
}
