// src/common/entities/unavailability.entity.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class Unavailability {
  @ApiProperty({ example: 'unav_123' })
  id: string;

  @ApiProperty({ example: 'user_abc123' })
  userId: string;

  @ApiProperty({
    type: 'string',
    format: 'date-time',
    example: '2025-11-01T00:00:00Z',
  })
  startDate: Date;

  @ApiProperty({
    type: 'string',
    format: 'date-time',
    example: '2025-11-10T23:59:59Z',
  })
  endDate: Date;

  @ApiPropertyOptional({ example: 'Conference attendance' })
  reason?: string;

  @ApiProperty({ type: 'string', format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ type: 'string', format: 'date-time' })
  updatedAt: Date;
}
