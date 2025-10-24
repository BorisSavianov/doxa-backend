// ============================================
// AUTH SERVICE (IMPROVED)
// src/auth/auth.service.ts
// ============================================

import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { UsersService } from '../users/users.service';
import { LoginDto, RegisterDto, AuthResponseDto, TokenResponseDto } from './dto/auth.dto';
import * as admin from 'firebase-admin';
import { Response, Request } from 'express';

@Injectable()
export class AuthService {
  constructor(
    private firebaseService: FirebaseService,
    private usersService: UsersService,
  ) {}

  async login(loginDto: LoginDto, res: Response): Promise<AuthResponseDto> {
    try {
      const auth = this.firebaseService.getAuth();

      // Get user by email
      let firebaseUser: admin.auth.UserRecord;
      try {
        firebaseUser = await auth.getUserByEmail(loginDto.email);
      } catch (error) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // Get user data from Firestore
      const user = await this.usersService.findById(firebaseUser.uid);
      if (!user) {
        throw new NotFoundException('User profile not found');
      }

      // Generate custom token for the user
      const customToken = await auth.createCustomToken(firebaseUser.uid);

      // Set HTTPOnly cookie with custom token
      this.setAuthCookie(res, customToken);

      return {
        user: user,
        customToken: customToken, // Send token so client can exchange it
        message: 'Login successful',
      };
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new UnauthorizedException('Authentication failed');
    }
  }

  async register(
    registerDto: RegisterDto,
    res: Response,
  ): Promise<AuthResponseDto> {
    try {
      const auth = this.firebaseService.getAuth();

      // Check if user already exists
      try {
        await auth.getUserByEmail(registerDto.email);
        throw new ConflictException('User with this email already exists');
      } catch (error) {
        if (error instanceof ConflictException) {
          throw error;
        }
      }

      // Create Firebase Auth user
      const firebaseUser = await auth.createUser({
        email: registerDto.email,
        password: registerDto.password,
        displayName: registerDto.fullName,
        emailVerified: false,
      });

      // Create user profile in Firestore
      const user = await this.usersService.create(firebaseUser.uid, {
        fullName: registerDto.fullName,
        academicRank: registerDto.academicRank,
        scientificField: registerDto.scientificField,
        university: registerDto.university,
        distanceToCity: registerDto.distanceToCity,
        role: registerDto.role,
      });

      // Generate custom token
      const customToken = await auth.createCustomToken(firebaseUser.uid);

      // Set HTTPOnly cookie
      this.setAuthCookie(res, customToken);

      return {
        user: user,
        customToken: customToken,
        message: 'Registration successful',
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new ConflictException('Registration failed');
    }
  }

  async verifyToken(uid: string): Promise<AuthResponseDto> {
    const user = await this.usersService.findById(uid);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      user: user,
      message: 'Token verified',
    };
  }

  async getTokenFromCookie(req: Request): Promise<TokenResponseDto> {
    const customToken = req.cookies?.auth_token;
    
    if (!customToken) {
      throw new UnauthorizedException('No authentication cookie found');
    }

    return {
      customToken: customToken,
      message: 'Token retrieved from cookie',
    };
  }

  async logout(res: Response): Promise<{ message: string }> {
    this.clearAuthCookie(res);
    return { message: 'Successfully logged out' };
  }

  private setAuthCookie(res: Response, token: string): void {
    const isProduction = process.env.NODE_ENV === 'production';
    
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: isProduction, // Only secure in production (HTTPS)
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      path: '/',
    });
  }

  private clearAuthCookie(res: Response): void {
    res.clearCookie('auth_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      path: '/',
    });
  }
}