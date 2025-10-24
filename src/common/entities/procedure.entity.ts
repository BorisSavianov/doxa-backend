// src/common/entities/procedure.entity.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ProcedureType {
  DOCTOR = 'doctor',
  DOCTOR_OF_SCIENCES = 'doctor_of_sciences',
  ASSOCIATE_PROFESSOR = 'associate_professor',
  PROFESSOR = 'professor',
}

export enum ProcedureStatus {
  DRAFT = 'draft',
  PENDING_JURY = 'pending_jury',
  JURY_SELECTED = 'jury_selected',
  AWAITING_CONFIRMATIONS = 'awaiting_confirmations',
  CONFIRMED = 'confirmed',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export class JuryMember {
  @ApiProperty({ example: 'user_abc123' })
  userId: string;

  @ApiProperty({ example: false })
  isExternal: boolean;

  @ApiProperty({ example: false })
  isReserve: boolean;

  @ApiProperty({
    example: 'pending',
    enum: ['pending', 'accepted', 'rejected'],
  })
  status: 'pending' | 'accepted' | 'rejected';

  @ApiProperty({
    type: 'string',
    format: 'date-time',
    example: '2025-10-20T09:00:00Z',
  })
  invitedAt: Date;

  @ApiPropertyOptional({
    type: 'string',
    format: 'date-time',
    example: '2025-10-21T10:00:00Z',
  })
  respondedAt?: Date;
}

export class Procedure {
  @ApiProperty({ example: 'proc_123' })
  id: string;

  @ApiProperty({
    type: 'string',
    format: 'date-time',
    example: '2026-01-15T10:00:00Z',
  })
  date: Date;

  @ApiProperty({ enum: ProcedureType })
  type: ProcedureType;

  @ApiProperty({ example: 'Dr. Ivan Petrov' })
  candidateName: string;

  @ApiProperty({ example: 'Computer Science' })
  scientificField: string;

  @ApiProperty({ enum: ProcedureStatus })
  status: ProcedureStatus;

  @ApiProperty({ type: [JuryMember] })
  juryMembers: JuryMember[];

  @ApiProperty({ example: 'admin_1' })
  createdBy: string;

  @ApiProperty({ type: 'string', format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ type: 'string', format: 'date-time' })
  updatedAt: Date;
}
