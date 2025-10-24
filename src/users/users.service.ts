// ============================================
// USERS SERVICE
// src/users/users.service.ts
// ============================================

import { Injectable, NotFoundException } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { User, UserRole } from '../common/entities/user.entity';

@Injectable()
export class UsersService {
  private readonly collection = 'users';

  constructor(private firebaseService: FirebaseService) {}

  async findById(id: string): Promise<User | null> {
    const db = this.firebaseService.getFirestore();
    const doc = await db.collection(this.collection).doc(id).get();

    if (!doc.exists) {
      return null;
    }

    return { id: doc.id, ...doc.data() } as User;
  }

  async findAll(): Promise<User[]> {
    const db = this.firebaseService.getFirestore();
    const snapshot = await db.collection(this.collection).get();

    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as User);
  }

  async findByScientificField(field: string): Promise<User[]> {
    const db = this.firebaseService.getFirestore();
    const snapshot = await db
      .collection(this.collection)
      .where('scientificField', '==', field)
      .get();

    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as User);
  }

  async create(userId: string, userData: Partial<User>): Promise<User> {
    const db = this.firebaseService.getFirestore();

    const user: Partial<User> = {
      ...userData,
      role: userData.role || UserRole.USER,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.collection(this.collection).doc(userId).set(user);

    return { id: userId, ...user } as User;
  }

  async update(id: string, userData: Partial<User>): Promise<User> {
    const db = this.firebaseService.getFirestore();

    const updateData = {
      ...userData,
      updatedAt: new Date(),
    };

    await db.collection(this.collection).doc(id).update(updateData);

    const updated = await this.findById(id);
    if (!updated) {
      throw new NotFoundException('User not found');
    }

    return updated;
  }

  async updateJuryDates(userId: string, newJuryDate: Date): Promise<void> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.update(userId, {
      penultimateJuryDate: user.lastJuryDate,
      lastJuryDate: newJuryDate,
    });
  }
}
