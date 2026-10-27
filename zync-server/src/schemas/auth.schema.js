import { z } from "zod";

export const registerSchema = z.object({
  name: z
    .string({ required_error: "Name is required" })
    .trim()
    .min(1, "Name is required"),
  email: z
    .string({ required_error: "A valid email is required" })
    .trim()
    .email("A valid email is required"),
  password: z
    .string({ required_error: "Password must be at least 8 characters" })
    .min(8, "Password must be at least 8 characters"),
});

export const loginSchema = z.object({
  email: z
    .string({ required_error: "Email and password are required" })
    .trim()
    .min(1, "Email is required"),
  password: z
    .string({ required_error: "Email and password are required" })
    .min(1, "Password is required"),
});
