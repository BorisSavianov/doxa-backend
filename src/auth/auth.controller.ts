// ============================================
// AUTH CONTROLLER
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
} from '@nestjs/swagger';
import { LoginDto, RegisterDto, AuthResponseDto } from './dto/auth.dto';
import { AdminGuard } from './guards/admin.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({ type: AuthResponseDto })
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(loginDto);
  }

  @Post('register')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Register new user (admin creates account)' })
  @ApiBody({ type: RegisterDto })
  @ApiCreatedResponse({ type: AuthResponseDto })
  async register(@Body() registerDto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(registerDto);
  }

  @Get('verify')
  @UseGuards(FirebaseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify token and get user data' })
  @ApiOkResponse({ type: AuthResponseDto })
  async verifyToken(@Request() req): Promise<AuthResponseDto> {
    return this.authService.verifyToken(req.user.uid);
  }

  @Post('logout')
  @UseGuards(FirebaseAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout current user' })
  @ApiOkResponse({ description: 'Successfully logged out' })
  async logout(@Request() req): Promise<{ message: string }> {
    // Firebase handles token invalidation client-side
    return { message: 'Successfully logged out' };
  }

  @Post('refresh')
  @UseGuards(FirebaseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Refresh authentication token' })
  @ApiOkResponse({ type: AuthResponseDto })
  async refreshToken(@Request() req): Promise<AuthResponseDto> {
    return this.authService.verifyToken(req.user.uid);
  }
}
