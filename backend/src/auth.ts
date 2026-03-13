import { SignJWT, jwtVerify } from 'jose';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Profile } from '../../shared/contracts.js';
import { env } from './env.js';

const secret = new TextEncoder().encode(env.BACKEND_JWT_SECRET);

export interface SessionClaims {
  sub: string;
  email: string;
}

export async function createSession(profile: Profile) {
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 12).toISOString();
  const accessToken = await new SignJWT({ email: profile.email })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(profile.id)
    .setIssuedAt()
    .setExpirationTime('12h')
    .sign(secret);

  return {
    accessToken,
    expiresAt,
    profile
  };
}

export async function verifySessionToken(token: string): Promise<SessionClaims> {
  const verified = await jwtVerify(token, secret);
  return {
    sub: verified.payload.sub ?? '',
    email: String(verified.payload.email ?? '')
  };
}

export async function requireSession(request: FastifyRequest, reply: FastifyReply) {
  const authorization = request.headers.authorization;
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined;

  if (!token) {
    reply.code(401).send({ message: 'Missing access token' });
    return null;
  }

  try {
    return await verifySessionToken(token);
  } catch {
    reply.code(401).send({ message: 'Invalid access token' });
    return null;
  }
}
