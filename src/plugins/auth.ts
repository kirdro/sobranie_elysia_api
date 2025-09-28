import { Elysia } from "elysia";
import { jwtVerify, type JWTPayload } from "jose";
import { env } from "../config/env";

export interface AuthContext {
  userId: string | null;
  email: string | null;
  role: string | null;
  isAuthenticated: boolean;
  token: string | null;
  payload: JWTPayload | null;
}

const defaultAuthContext: AuthContext = {
  userId: null,
  email: null,
  role: null,
  isAuthenticated: false,
  token: null,
  payload: null
};

async function verifyToken(token: string): Promise<JWTPayload | null> {
  const secret = new TextEncoder().encode(env.JWT_SECRET);
  
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (error) {
    return null;
  }
}

export const authPlugin = new Elysia({ name: "auth" }).derive(async ({ headers }) => {
  const authHeader = headers.authorization || headers.Authorization;
  const token = authHeader?.replace(/^Bearer\s+/i, "") ?? null;

  if (!token) {
    return { auth: defaultAuthContext };
  }

  const payload = await verifyToken(token);
  
  if (!payload || !payload.sub) {
    return { auth: defaultAuthContext };
  }

  return {
    auth: {
      userId: payload.sub,
      email: payload.email as string || null,
      role: payload.role as string || null,
      isAuthenticated: true,
      token,
      payload
    }
  } satisfies { auth: AuthContext };
});

