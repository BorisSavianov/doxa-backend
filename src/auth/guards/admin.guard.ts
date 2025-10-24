// ============================================
// ADMIN GUARD
// src/auth/guards/admin.guard.ts
// ============================================

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { UsersService } from '../../users/users.service';
import { UserRole } from 'src/common/entities/user.entity';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private usersService: UsersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.uid) {
      throw new ForbiddenException('User not authenticated');
    }

    const userDoc = await this.usersService.findById(user.uid);

    if (!userDoc || userDoc.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Admin access required');
    }

    return true;
  }
}
