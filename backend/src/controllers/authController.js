// ========================================================================
// AUTHENTICATION CONTROLLER
// Handles user registration, login, company signup, current user info
// Uses raw SQL queries via pg driver
// ========================================================================

import { v4 as uuidv4 } from 'uuid';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { generateToken } from '../utils/jwt.js';
import { query, queryOne, execute } from '../utils/db.js';

/**
 * Register a new user
 * POST /api/auth/register
 * Body: { email, password, firstName, lastName }
 */
export async function registerUser(req, res, next) {
  try {
    const { email, password, firstName, lastName } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Check if user already exists
    const existingUser = await queryOne(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const passwordHash = await hashPassword(password);
    const userId = uuidv4();
    const now = new Date();

    // Insert user into database
    const newUser = await queryOne(
      `INSERT INTO users 
       (id, email, password_hash, first_name, last_name, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING id, email, first_name, last_name, created_at`,
      [userId, email.toLowerCase(), passwordHash, firstName || null, lastName || null, now, now]
    );

    // Generate JWT token
    const token = generateToken({
      userId: newUser.id,
      email: newUser.email,
    });

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.first_name,
        lastName: newUser.last_name,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Login user
 * POST /api/auth/login
 * Body: { email, password }
 */
export async function loginUser(req, res, next) {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Find user by email
    const user = await queryOne(
      'SELECT id, email, password_hash, first_name, last_name FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login timestamp
    const now = new Date();
    await execute(
      'UPDATE users SET last_login_at = $1 WHERE id = $2',
      [now, user.id]
    );

    // Get user's company roles
    const roles = await query(
      `SELECT ucr.company_id, ucr.role, c.name as company_name
       FROM user_company_roles ucr
       JOIN companies c ON ucr.company_id = c.id
       WHERE ucr.user_id = $1
       ORDER BY c.name`,
      [user.id]
    );

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      roles: roles.rows,
    });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        companies: roles.rows.map((r) => ({
          companyId: r.company_id,
          companyName: r.company_name,
          role: r.role,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Create a new company and register user as company admin
 * POST /api/auth/company/signup
 * Body: { email, password, companyName, country, industry, firstName, lastName }
 */
export async function signupCompany(req, res, next) {
  try {
    const {
      email,
      password,
      companyName,
      country,
      industry,
      firstName,
      lastName,
    } = req.body;

    // Validate input
    if (!email || !password || !companyName) {
      return res.status(400).json({
        error: 'Email, password, and company name required',
      });
    }

    // Check if user already exists
    const existingUser = await queryOne(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const passwordHash = await hashPassword(password);
    const userId = uuidv4();
    const companyId = uuidv4();
    const now = new Date();

    // Insert user
    await execute(
      `INSERT INTO users 
       (id, email, password_hash, first_name, last_name, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, email.toLowerCase(), passwordHash, firstName || null, lastName || null, now, now]
    );

    // Insert company
    await execute(
      `INSERT INTO companies 
       (id, name, country_code, industry, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [companyId, companyName, country || 'US', industry || null, now, now]
    );

    // Add user as company_admin
    await execute(
      `INSERT INTO user_company_roles 
       (id, user_id, company_id, role, created_at) 
       VALUES ($1, $2, $3, $4, $5)`,
      [uuidv4(), userId, companyId, 'company_admin', now]
    );

    // Insert locale settings (default to EN, UTC)
    await execute(
      `INSERT INTO locale_settings 
       (id, company_id, language, timezone, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [uuidv4(), companyId, 'EN', 'UTC', now, now]
    );

    // Generate JWT token
    const token = generateToken({
      userId,
      email: email.toLowerCase(),
      roles: [{ companyId, companyName, role: 'company_admin' }],
    });

    res.status(201).json({
      message: 'Company and user created successfully',
      token,
      user: {
        id: userId,
        email: email.toLowerCase(),
        firstName,
        lastName,
        company: {
          id: companyId,
          name: companyName,
          role: 'company_admin',
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get current authenticated user
 * GET /api/auth/me
 * Requires: Valid JWT token in Authorization header
 */
export async function getCurrentUser(req, res, next) {
  try {
    const userId = req.user.userId;

    // Get user info
    const user = await queryOne(
      'SELECT id, email, first_name, last_name FROM users WHERE id = $1',
      [userId]
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user's company roles
    const roles = await query(
      `SELECT ucr.company_id, ucr.role, c.name as company_name
       FROM user_company_roles ucr
       JOIN companies c ON ucr.company_id = c.id
       WHERE ucr.user_id = $1
       ORDER BY c.name`,
      [userId]
    );

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        companies: roles.rows.map((r) => ({
          companyId: r.company_id,
          companyName: r.company_name,
          role: r.role,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
}
