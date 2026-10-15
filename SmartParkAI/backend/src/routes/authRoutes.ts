import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { ENV } from '../config/env';
import { dbState, memDb } from '../config/database';
import { UserModel } from '../models/User';
import { authenticateJWT } from '../middleware/auth';
import { validateBody } from '../middleware/validate';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  fullName: z.string().min(2),
  phone: z.string().optional(),
  role: z.enum(['user', 'operator', 'admin']).default('user'),
  defaultVehiclePlate: z.string().optional(),
  companyName: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const updateProfileSchema = z.object({
  fullName: z.string().min(2).optional(),
  phone: z.string().optional(),
  defaultVehiclePlate: z.string().optional(),
  companyName: z.string().optional(),
});

// Register
router.post('/register', validateBody(registerSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, fullName, phone, role, defaultVehiclePlate, companyName } = req.body;
    const lowerEmail = email.toLowerCase().trim();

    if (dbState.mode === 'mongodb') {
      const existing = await UserModel.findOne({ email: lowerEmail });
      if (existing) {
        res.status(409).json({ success: false, error: 'A user with this email address already exists.' });
        return;
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      const user = await UserModel.create({
        email: lowerEmail,
        passwordHash,
        fullName,
        phone,
        role: role || 'user',
        defaultVehiclePlate: defaultVehiclePlate?.toUpperCase(),
        companyName,
      });

      const token = jwt.sign(
        { id: user._id.toString(), email: user.email, role: user.role, fullName: user.fullName },
        ENV.JWT_SECRET,
        { expiresIn: ENV.JWT_EXPIRES_IN }
      );

      res.status(201).json({
        success: true,
        token,
        user: {
          id: user._id.toString(),
          email: user.email,
          fullName: user.fullName,
          phone: user.phone,
          role: user.role,
          defaultVehiclePlate: user.defaultVehiclePlate,
          companyName: user.companyName,
          createdAt: user.createdAt,
        },
      });
    } else {
      // In-Memory
      for (const u of memDb.users.values()) {
        if (u.email === lowerEmail) {
          res.status(409).json({ success: false, error: 'A user with this email address already exists.' });
          return;
        }
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);
      const userId = `usr-${Date.now()}`;

      const user = {
        id: userId,
        _id: userId,
        email: lowerEmail,
        passwordHash,
        fullName,
        phone,
        role: role || 'user',
        defaultVehiclePlate: defaultVehiclePlate?.toUpperCase(),
        companyName,
        createdAt: new Date().toISOString(),
      };

      memDb.users.set(userId, user);

      const token = jwt.sign(
        { id: userId, email: user.email, role: user.role, fullName: user.fullName },
        ENV.JWT_SECRET,
        { expiresIn: ENV.JWT_EXPIRES_IN }
      );

      res.status(201).json({
        success: true,
        token,
        user: {
          id: userId,
          email: user.email,
          fullName: user.fullName,
          phone: user.phone,
          role: user.role,
          defaultVehiclePlate: user.defaultVehiclePlate,
          companyName: user.companyName,
          createdAt: user.createdAt,
        },
      });
    }
  } catch (error) {
    next(error);
  }
});

// Login
router.post('/login', validateBody(loginSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    const lowerEmail = email.toLowerCase().trim();

    let user: any = null;

    if (dbState.mode === 'mongodb') {
      user = await UserModel.findOne({ email: lowerEmail });
    } else {
      for (const u of memDb.users.values()) {
        if (u.email === lowerEmail) {
          user = u;
          break;
        }
      }
    }

    if (!user) {
      res.status(401).json({ success: false, error: 'Invalid email or password.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ success: false, error: 'Invalid email or password.' });
      return;
    }

    const userId = user._id ? user._id.toString() : user.id;
    const token = jwt.sign(
      { id: userId, email: user.email, role: user.role, fullName: user.fullName },
      ENV.JWT_SECRET,
      { expiresIn: ENV.JWT_EXPIRES_IN }
    );

    res.json({
      success: true,
      token,
      user: {
        id: userId,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        role: user.role,
        defaultVehiclePlate: user.defaultVehiclePlate,
        companyName: user.companyName,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get Profile (Me)
router.get('/me', authenticateJWT, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    let user: any = null;

    if (dbState.mode === 'mongodb') {
      user = await UserModel.findById(userId).select('-passwordHash');
    } else {
      user = memDb.users.get(userId);
    }

    if (!user) {
      res.status(404).json({ success: false, error: 'User profile not found.' });
      return;
    }

    res.json({
      success: true,
      user: {
        id: user._id ? user._id.toString() : user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        role: user.role,
        defaultVehiclePlate: user.defaultVehiclePlate,
        companyName: user.companyName,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Update Profile
router.put('/profile', authenticateJWT, validateBody(updateProfileSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { fullName, phone, defaultVehiclePlate, companyName } = req.body;

    if (dbState.mode === 'mongodb') {
      const user = await UserModel.findByIdAndUpdate(
        userId,
        {
          ...(fullName && { fullName }),
          ...(phone !== undefined && { phone }),
          ...(defaultVehiclePlate && { defaultVehiclePlate: defaultVehiclePlate.toUpperCase() }),
          ...(companyName !== undefined && { companyName }),
        },
        { new: true }
      ).select('-passwordHash');

      res.json({ success: true, user });
    } else {
      const user = memDb.users.get(userId);
      if (!user) {
        res.status(404).json({ success: false, error: 'User not found.' });
        return;
      }
      if (fullName) user.fullName = fullName;
      if (phone !== undefined) user.phone = phone;
      if (defaultVehiclePlate) user.defaultVehiclePlate = defaultVehiclePlate.toUpperCase();
      if (companyName !== undefined) user.companyName = companyName;

      res.json({ success: true, user });
    }
  } catch (error) {
    next(error);
  }
});

export default router;
