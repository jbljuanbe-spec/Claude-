import { redirect } from "next/navigation";
import { readSession } from "@/lib/session";

export default async function Home() {
  const session = await readSession();
  if (!session) redirect("/login");
  redirect(session.role === "THERAPIST" ? "/agenda" : "/diario");
}
