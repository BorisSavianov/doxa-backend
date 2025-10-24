// ============================================
// AUTH CONTROLLER (IMPROVED)
// src/auth/auth.controller.ts
// ============================================

import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Res,
  Req,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { FirebaseAuthGuard } from './guards/firebase-auth.guard';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiBody,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { LoginDto, RegisterDto, AuthResponseDto, TokenResponseDto } from './dto/auth.dto';
import { AdminGuard } from './guards/admin.guard';
import { Response, Request as ExpressRequest } from 'express';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({ type: AuthResponseDto })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    return this.authService.login(loginDto, res);
  }

  @Post('register')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Register new user (admin creates account)' })
  @ApiBody({ type: RegisterDto })
  @ApiCreatedResponse({ type: AuthResponseDto })
  async register(
    @Body() registerDto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    return this.authService.register(registerDto, res);
  }

  @Get('verify')
  @UseGuards(FirebaseAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth('auth_token')
  @ApiOperation({ summary: 'Verify token and get user data' })
  @ApiOkResponse({ type: AuthResponseDto })
  async verifyToken(@Request() req): Promise<AuthResponseDto> {
    return this.authService.verifyToken(req.user.uid);
  }

  @Get('me')
  @UseGuards(FirebaseAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth('auth_token')
  @ApiOperation({ summary: 'Get current user from cookie' })
  @ApiOkResponse({ type: AuthResponseDto })
  async getCurrentUser(@Request() req): Promise<AuthResponseDto> {
    return this.authService.verifyToken(req.user.uid);
  }

  @Get('token')
  @ApiCookieAuth('auth_token')
  @ApiOperation({ summary: 'Get custom token from cookie (for Firebase client SDK)' })
  @ApiOkResponse({ type: TokenResponseDto })
  async getToken(@Req() req: ExpressRequest): Promise<TokenResponseDto> {
    return this.authService.getTokenFromCookie(req);
  }

  @Post('logout')
  @UseGuards(FirebaseAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth('auth_token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout current user' })
  @ApiOkResponse({ description: 'Successfully logged out' })
  async logout(
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    return this.authService.logout(res);
  }

  @Post('refresh')
  @UseGuards(FirebaseAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth('auth_token')
  @ApiOperation({ summary: 'Refresh authentication token' })
  @ApiOkResponse({ type: AuthResponseDto })
  async refreshToken(@Request() req): Promise<AuthResponseDto> {
    return this.authService.verifyToken(req.user.uid);
  }
}