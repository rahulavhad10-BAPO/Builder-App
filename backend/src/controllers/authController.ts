import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../db/prisma.js';
import { ROLE_PERMISSIONS } from '../config/permissions.js';

const JWT_SECRET = process.env.JWT_SECRET || 'builder_ops_command_center_jwt_secret_key_2026_super_secure';

export class AuthController {
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required' });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { email },
        include: { organization: true },
      });

      if (!user) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
      }

      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          organizationId: user.organizationId,
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      const permissions = ROLE_PERMISSIONS[user.role] || [];

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          organizationId: user.organizationId,
          organizationName: user.organization.name,
        },
        permissions,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Internal server error during login' });
    }
  }

  static async getMe(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        include: { organization: true },
      });

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const permissions = ROLE_PERMISSIONS[user.role] || [];

      res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          organizationId: user.organizationId,
          organizationName: user.organization.name,
        },
        permissions,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async getUsers(_req: Request, res: Response): Promise<void> {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          phone: true,
          status: true,
          createdAt: true,
        },
        orderBy: { name: 'asc' },
      });
      res.json(users);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}
