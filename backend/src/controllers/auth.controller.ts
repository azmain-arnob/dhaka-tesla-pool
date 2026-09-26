import { Request, Response } from "express";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import {
  getUserById,
  loginUser,
  registerUser,
} from "../services/auth.service";

const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(100),
  role: z.enum([UserRole.PASSENGER, UserRole.DRIVER]),
});

const loginSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(1).max(100),
});

export async function register(req: Request, res: Response) {
  const result = registerSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      message: "Validation failed",
      errors: result.error.issues,
    });
  }

  try {
    const data = await registerUser({
      name: result.data.name,
      email: result.data.email.toLowerCase(),
      password: result.data.password,
      role: result.data.role,
    });

    return res.status(201).json({
      message: "Registration successful",
      data,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "EMAIL_ALREADY_EXISTS") {
      return res.status(409).json({
        message: "A user with this email already exists",
      });
    }

    console.error("Registration error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

export async function login(req: Request, res: Response) {
  const result = loginSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      message: "Validation failed",
      errors: result.error.issues,
    });
  }

  try {
    const data = await loginUser({
      email: result.data.email.toLowerCase(),
      password: result.data.password,
    });

    return res.status(200).json({
      message: "Login successful",
      data,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_CREDENTIALS") {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    console.error("Login error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

export async function me(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({
      message: "Authentication required",
    });
  }

  try {
    const user = await getUserById(req.user.userId);

    return res.status(200).json({
      data: {
        user,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "USER_NOT_FOUND") {
      return res.status(404).json({
        message: "User not found",
      });
    }

    console.error("Get current user error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}