// src/procedures/procedures.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ProceduresService } from './procedures.service';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { Procedure } from '../common/entities/procedure.entity';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';

@Controller('procedures')
@UseGuards(FirebaseAuthGuard)
@ApiTags('procedures')
@ApiBearerAuth()
export class ProceduresController {
  constructor(private proceduresService: ProceduresService) {}

  @Get()
  @ApiOperation({ summary: 'Get all procedures' })
  @ApiOkResponse({ type: [Procedure] })
  async getAllProcedures(): Promise<Procedure[]> {
    return this.proceduresService.findAll();
  }

  @Get('my')
  @ApiOperation({ summary: 'Get procedures for current user' })
  @ApiOkResponse({ type: [Procedure] })
  async getMyProcedures(@Request() req): Promise<Procedure[]> {
    return this.proceduresService.findByUserId(req.user.uid);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single procedure by id' })
  @ApiParam({ name: 'id', required: true })
  @ApiOkResponse({ type: Procedure })
  async getProcedure(@Param('id') id: string): Promise<Procedure> {
    return this.proceduresService.findById(id);
  }

  @Post()
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Create a procedure' })
  @ApiBody({ type: Procedure })
  @ApiCreatedResponse({ type: Procedure })
  async createProcedure(
    @Body() procedureData: Partial<Procedure>,
    @Request() req,
  ): Promise<Procedure> {
    return this.proceduresService.create(procedureData, req.user.uid);
  }

  @Post(':id/auto-select-jury')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Auto-select jury for a procedure' })
  @ApiParam({ name: 'id' })
  @ApiOkResponse({ type: Procedure })
  async autoSelectJury(@Param('id') id: string): Promise<Procedure> {
    return this.proceduresService.autoSelectJury(id);
  }

  @Post(':id/respond')
  @ApiOperation({ summary: 'Respond to jury invitation' })
  @ApiParam({ name: 'id' })
  @ApiBody({ schema: { properties: { accept: { type: 'boolean' } } } })
  @ApiOkResponse({ type: Procedure })
  async respondToInvitation(
    @Param('id') id: string,
    @Body('accept') accept: boolean,
    @Request() req,
  ): Promise<Procedure> {
    return this.proceduresService.respondToInvitation(id, req.user.uid, accept);
  }

  @Put(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Update a procedure' })
  @ApiParam({ name: 'id' })
  @ApiBody({ type: Procedure })
  @ApiOkResponse({ type: Procedure })
  async updateProcedure(
    @Param('id') id: string,
    @Body() procedureData: Partial<Procedure>,
  ): Promise<Procedure> {
    return this.proceduresService.update(id, procedureData);
  }

  @Post(':id/complete')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Mark procedure as complete' })
  @ApiParam({ name: 'id' })
  @ApiOkResponse({ type: Procedure })
  async completeProcedure(@Param('id') id: string): Promise<Procedure> {
    return this.proceduresService.completeProcedure(id);
  }
}
