import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE = "rifamax_admin";

function adminPassword(): string {
  const pw = process.env.ADMIN_PASSWORD;
  if (pw) return pw;
  if (process.env.NODE_ENV === "production") {
    throw new Error("Falta la variable de entorno ADMIN_PASSWORD");
  }
  return "admin";
}

function sessionToken(): string {
  const secret = process.env.SESSION_SECRET || adminPassword();
  return createHmac("sha256", secret).update("rifamax-admin-v1").digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function checkPassword(input: string): boolean {
  return safeEqual(input, adminPassword());
}

export async function startSession() {
  (await cookies()).set(COOKIE, sessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

export async function isAdmin(): Promise<boolean> {
  const value = (await cookies()).get(COOKIE)?.value;
  return !!value && safeEqual(value, sessionToken());
}

export async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin/login");
}
