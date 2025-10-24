// ============================================
// FIREBASE SERVICE
// src/firebase/firebase.service.ts
// ============================================

import { Injectable, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private firestore: admin.firestore.Firestore;
  private auth: admin.auth.Auth;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const serviceAccount = require('../../hackatonKey.json');

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    this.firestore = admin.firestore();
    this.auth = admin.auth();
  }

  getFirestore(): admin.firestore.Firestore {
    return this.firestore;
  }

  getAuth(): admin.auth.Auth {
    return this.auth;
  }

  async verifyIdToken(token: string): Promise<admin.auth.DecodedIdToken> {
    return this.auth.verifyIdToken(token);
  }
}
