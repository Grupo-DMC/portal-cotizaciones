import { redirect } from "next/navigation";
import { getSessionUser } from "@/server/auth/dal";

export default async function Raiz() {
  redirect((await getSessionUser()) ? "/inicio" : "/login");
}
