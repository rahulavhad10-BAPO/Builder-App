import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../db/prisma.js';
import { hasPermission } from '../config/permissions.js';

const JWT_SECRET = process.env.JWT_SECRET || 'builder_ops_command_center_jwt_secret_key_2026_super_secure';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: string;
  organizationId: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Authentication token is required' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
    // Verify user exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, name: true, role: true, organizationId: true, status: true },
    });

    if (!user || user.status !== 'ACTIVE') {
      res.status(401).json({ error: 'Unauthorized: User account inactive or not found' });
      return;
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
    return;
  }
}

export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!hasPermission(req.user.role, permission)) {
      res.status(403).json({
        error: `Forbidden: User with role '${req.user.role}' lacks required permission '${permission}'`,
      });
      return;
    }

    next();
  };
}
