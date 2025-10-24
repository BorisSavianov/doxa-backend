// ============================================
// AUTH DTOs (IMPROVED)
// src/auth/dto/auth.dto.ts
// ============================================

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsEnum,
  IsNumber,
  IsOptional,
} from 'class-validator';
import {
  AcademicRank,
  User,
  UserRole,
} from '../../common/entities/user.entity';

export class LoginDto {
  @ApiProperty({ example: 'professor@university.bg' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'password123', minLength: 6 })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}

export class RegisterDto {
  @ApiProperty({ example: 'professor@university.bg' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'password123', minLength: 6 })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'Dr. Ivan Petrov' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ enum: AcademicRank })
  @IsEnum(AcademicRank)
  @IsNotEmpty()
  academicRank: AcademicRank;

  @ApiProperty({ example: 'Computer Science' })
  @IsString()
  @IsNotEmpty()
  scientificField: string;

  @ApiProperty({ example: 'Sofia University' })
  @IsString()
  @IsNotEmpty()
  university: string;

  @ApiProperty({ example: 50 })
  @IsNumber()
  @IsNotEmpty()
  distanceToCity: number;

  @ApiPropertyOptional({ enum: UserRole, default: UserRole.USER })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;
}

export class AuthResponseDto {
  @ApiProperty({ type: User })
  user: User;

  @ApiPropertyOptional({ 
    description: 'Custom token for Firebase client SDK (only in login/register)' 
  })
  customToken?: string;

  @ApiProperty()
  message: string;
}

export class TokenResponseDto {
  @ApiProperty({ description: 'Custom token from HTTPOnly cookie' })
  customToken: string;

  @ApiProperty()
  message: string;
}