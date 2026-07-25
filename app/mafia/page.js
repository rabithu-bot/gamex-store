import { redirect } from "next/navigation";
import { requireAdmin } from "@/app/lib/session";
import Dashboard from "./Dashboard";

export default async function AdminPage() {
  if (!(await requireAdmin())) {
    redirect("/mafia/login");
  }

  return (
    <main className="container">
      <Dashboard />
    </main>
  );
}
