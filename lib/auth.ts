import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const SESSION_COOKIE = "hospedaje_admin";
const SESSION_VALUE = "authenticated";

export async function checkAdminAuth() {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE);
  if (session?.value !== SESSION_VALUE) {
    redirect("/admin/login");
  }
}

export async function setAdminSession() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, SESSION_VALUE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE);
  return session?.value === SESSION_VALUE;
}
