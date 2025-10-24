// ============================================
// AUTH GUARD (Cookie + Custom Token Support)
// src/auth/guards/firebase-auth.guard.ts
// ============================================

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { FirebaseService } from '../../firebase/firebase.service';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  private readonly logger = new Logger(FirebaseAuthGuard.name);

  constructor(private firebaseService: FirebaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Try header first
    let token = this.extractTokenFromHeader(request);
    // Then cookies
    if (!token) token = this.extractTokenFromCookie(request);

    if (!token) throw new UnauthorizedException('No token provided');

    try {
      let decodedToken;

      // Attempt to verify as an ID token first
      try {
        decodedToken = await this.firebaseService.verifyIdToken(token);
      } catch {
        // If verification fails, it might be a custom token — exchange it
        this.logger.debug('Attempting to exchange custom token for ID token...');
        const idToken = await this.exchangeCustomTokenForIdToken(token);
        decodedToken = await this.firebaseService.verifyIdToken(idToken);

        // Optionally, refresh cookie with ID token for next requests
        request.res?.cookie('auth_token', idToken, {
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
          path: '/',
          maxAge: 60 * 60 * 1000, // 1 hour
        });
      }

      request.user = { uid: decodedToken.uid, email: decodedToken.email };
      return true;
    } catch (error) {
      this.logger.error(`Firebase token verification failed: ${error.message}`);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }

  private extractTokenFromCookie(request: any): string | undefined {
    return request.cookies?.auth_token;
  }

  /**
   * Exchanges a Firebase Custom Token for an ID Token via Firebase Admin SDK.
   */
  private async exchangeCustomTokenForIdToken(customToken: string): Promise<string> {
    try {
      const userCredential = await admin
        .auth()
        .verifyIdToken(customToken)
        .catch(async () => null);

      if (userCredential) {
        // It's already an ID token
        return customToken;
      }

      // Otherwise, it's a custom token: sign in with it using Firebase REST API
      const apiKey = process.env.FIREBASE_API_KEY;
      const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: customToken, returnSecureToken: true }),
      });

      const data = await res.json();

      if (!res.ok || !data.idToken) {
        throw new Error(data.error?.message || 'Failed to exchange custom token');
      }

      return data.idToken;
    } catch (error) {
      this.logger.error('Error exchanging custom token:', error.message);
      throw new UnauthorizedException('Token exchange failed');
    }
  }
}
