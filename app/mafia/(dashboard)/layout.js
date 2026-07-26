import { redirect } from "next/navigation";
import { requireAdmin } from "@/app/lib/session";
import AdminHeader from "@/app/mafia/AdminHeader";

export default async function AdminDashboardLayout({ children }) {
  if (!(await requireAdmin())) {
    redirect("/mafia/login");
  }

  return (
    <>
      <AdminHeader />
      <main className="container">{children}</main>
    </>
  );
}
