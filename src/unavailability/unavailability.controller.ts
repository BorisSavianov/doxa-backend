// src/unavailability/unavailability.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { UnavailabilityService } from './unavailability.service';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';
import { Unavailability } from '../common/entities/unavailability.entity';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';

@Controller('unavailability')
@UseGuards(FirebaseAuthGuard)
@ApiTags('unavailability')
@ApiBearerAuth()
export class UnavailabilityController {
  constructor(private unavailabilityService: UnavailabilityService) {}

  @Get('my')
  @ApiOperation({ summary: 'Get current user unavailability entries' })
  @ApiOkResponse({ type: [Unavailability] })
  async getMyUnavailability(@Request() req): Promise<Unavailability[]> {
    return this.unavailabilityService.findByUserId(req.user.uid);
  }

  @Post()
  @ApiOperation({ summary: 'Create unavailability' })
  @ApiBody({
    schema: {
      properties: {
        startDate: { type: 'string', format: 'date-time' },
        endDate: { type: 'string', format: 'date-time' },
        reason: { type: 'string' },
      },
      required: ['startDate', 'endDate'],
    },
  })
  @ApiCreatedResponse({ type: Unavailability })
  async createUnavailability(
    @Body('startDate') startDate: string,
    @Body('endDate') endDate: string,
    @Body('reason') reason: string,
    @Request() req,
  ): Promise<Unavailability> {
    return this.unavailabilityService.create(
      req.user.uid,
      new Date(startDate),
      new Date(endDate),
      reason,
    );
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update unavailability entry' })
  @ApiParam({ name: 'id' })
  @ApiBody({ type: Unavailability })
  @ApiOkResponse({ type: Unavailability })
  async updateUnavailability(
    @Param('id') id: string,
    @Body() data: Partial<Unavailability>,
  ): Promise<Unavailability> {
    return this.unavailabilityService.update(id, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete unavailability entry' })
  @ApiParam({ name: 'id' })
  @ApiOkResponse({ type: 'boolean', description: 'True on success' })
  async deleteUnavailability(@Param('id') id: string): Promise<void> {
    return this.unavailabilityService.delete(id);
  }
}
