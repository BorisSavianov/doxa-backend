// ============================================
// UNAVAILABILITY SERVICE
// src/unavailability/unavailability.service.ts
// ============================================

import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { Unavailability } from '../common/entities/unavailability.entity';

@Injectable()
export class UnavailabilityService {
  private readonly collection = 'unavailabilities';

  constructor(private firebaseService: FirebaseService) {}

  async create(
    userId: string,
    startDate: Date,
    endDate: Date,
    reason?: string,
  ): Promise<Unavailability> {
    const db = this.firebaseService.getFirestore();

    const unavailability: Partial<Unavailability> = {
      userId,
      startDate,
      endDate,
      reason,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await db.collection(this.collection).add(unavailability);

    return { id: docRef.id, ...unavailability } as Unavailability;
  }

  async findByUserId(userId: string): Promise<Unavailability[]> {
    const db = this.firebaseService.getFirestore();
    const snapshot = await db
      .collection(this.collection)
      .where('userId', '==', userId)
      .orderBy('startDate', 'desc')
      .get();

    return snapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() }) as Unavailability,
    );
  }

  async isUserAvailable(userId: string, date: Date): Promise<boolean> {
    const db = this.firebaseService.getFirestore();
    const snapshot = await db
      .collection(this.collection)
      .where('userId', '==', userId)
      .where('startDate', '<=', date)
      .where('endDate', '>=', date)
      .get();

    return snapshot.empty;
  }

  async delete(id: string): Promise<void> {
    const db = this.firebaseService.getFirestore();
    await db.collection(this.collection).doc(id).delete();
  }

  async update(
    id: string,
    data: Partial<Unavailability>,
  ): Promise<Unavailability> {
    const db = this.firebaseService.getFirestore();

    const updateData = {
      ...data,
      updatedAt: new Date(),
    };

    await db.collection(this.collection).doc(id).update(updateData);

    const doc = await db.collection(this.collection).doc(id).get();
    return { id: doc.id, ...doc.data() } as Unavailability;
  }
}
