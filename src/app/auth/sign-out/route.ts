import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function GET() {
  const cookieStore = await cookies();
  for (const c of cookieStore.getAll()) {
    if (c.name.includes("better-auth")) {
      cookieStore.delete(c.name);
    }
  }
  redirect("/login");
}
