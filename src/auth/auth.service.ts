// ============================================
// AUTH SERVICE
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
import { LoginDto, RegisterDto, AuthResponseDto } from './dto/auth.dto';
import * as admin from 'firebase-admin';

@Injectable()
export class AuthService {
  constructor(
    private firebaseService: FirebaseService,
    private usersService: UsersService,
  ) {}

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    try {
      // Note: Firebase Admin SDK doesn't directly support email/password login
      // This would typically be done on the client side using Firebase Auth SDK
      // Here we verify if the user exists in our system
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

      return {
        token: customToken,
        user: user,
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

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    try {
      const auth = this.firebaseService.getAuth();

      // Check if user already exists
      try {
        await auth.getUserByEmail(registerDto.email);
        throw new ConflictException('User with this email already exists');
      } catch (error) {
        // User doesn't exist, which is what we want
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

      return {
        token: customToken,
        user: user,
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

    const auth = this.firebaseService.getAuth();
    const customToken = await auth.createCustomToken(uid);

    return {
      token: customToken,
      user: user,
      message: 'Token verified',
    };
  }
}
