import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { UserRole } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { env } from "../config/env";
import { AuthTokenPayload } from "../types/auth";

const SALT_ROUNDS = 12;

interface RegisterInput {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

interface LoginInput {
  email: string;
  password: string;
}

function createToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: "7d",
  });
}

function sanitizeUser(user: {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

export async function registerUser(input: RegisterInput) {
  const existingUser = await prisma.user.findUnique({
    where: {
      email: input.email,
    },
  });

  if (existingUser) {
    throw new Error("EMAIL_ALREADY_EXISTS");
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      role: input.role,
    },
  });

  const token = createToken({
    userId: user.id,
    role: user.role,
  });

  return {
    user: sanitizeUser(user),
    token,
  };
}

export async function loginUser(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: {
      email: input.email,
    },
  });

  if (!user) {
    throw new Error("INVALID_CREDENTIALS");
  }

  const passwordMatches = await bcrypt.compare(
    input.password,
    user.passwordHash,
  );

  if (!passwordMatches) {
    throw new Error("INVALID_CREDENTIALS");
  }

  const token = createToken({
    userId: user.id,
    role: user.role,
  });

  return {
    user: sanitizeUser(user),
    token,
  };
}

export async function getUserById(userId: string) {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }

  return sanitizeUser(user);
}