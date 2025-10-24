// src/common/entities/user.entity.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum AcademicRank {
  PROFESSOR = 'professor',
  ASSOCIATE_PROFESSOR = 'associate_professor',
}

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

export class User {
  @ApiProperty({ example: 'user_abc123' })
  id: string;

  @ApiProperty({ enum: AcademicRank })
  academicRank: AcademicRank;

  @ApiProperty({ example: 'Ivan Ivanov' })
  fullName: string;

  @ApiProperty({ example: 'Mathematics' })
  scientificField: string;

  @ApiProperty({ example: 'Sofia University' })
  university: string;

  @ApiProperty({ example: 15 })
  distanceToCity: number;

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  penultimateJuryDate?: Date;

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  lastJuryDate?: Date;

  @ApiProperty({ enum: UserRole })
  role: UserRole;

  @ApiProperty({ type: 'string', format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ type: 'string', format: 'date-time' })
  updatedAt: Date;
}
