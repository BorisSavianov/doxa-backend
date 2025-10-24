// src/users/users.controller.ts
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
import { UsersService } from './users.service';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { User } from '../common/entities/user.entity';
import { NotFoundException } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';

@Controller('users')
@UseGuards(FirebaseAuthGuard)
@ApiTags('users')
@ApiBearerAuth()
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiOkResponse({ type: User })
  async getCurrentUser(@Request() req): Promise<User> {
    const user = await this.usersService.findById(req.user.uid);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  @Get()
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Get all users (admin)' })
  @ApiOkResponse({ type: [User] })
  async getAllUsers(): Promise<User[]> {
    return this.usersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by id' })
  @ApiParam({ name: 'id' })
  @ApiOkResponse({ type: User })
  async getUser(@Param('id') id: string): Promise<User> {
    const user = await this.usersService.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  @Put(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Update a user (admin)' })
  @ApiParam({ name: 'id' })
  @ApiBody({ type: User })
  @ApiOkResponse({ type: User })
  async updateUser(
    @Param('id') id: string,
    @Body() userData: Partial<User>,
  ): Promise<User> {
    return this.usersService.update(id, userData);
  }
}
