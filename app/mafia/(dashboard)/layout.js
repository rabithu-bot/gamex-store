import { redirect } from "next/navigation";
import { getAdminSessionStatus } from "@/app/lib/session";
import AdminHeader from "@/app/mafia/AdminHeader";

// Overrides the root layout's <link rel="manifest"> (which points at the
// storefront's manifest.js) with the /mafia one instead — see
// app/mafia/manifest.js — so installability here is judged against, and
// "Add to Home Screen" here installs, the admin app rather than the store.
export const metadata = {
  manifest: "/mafia/manifest.webmanifest",
};

export default async function AdminDashboardLayout({ children }) {
  const status = await getAdminSessionStatus();
  if (status !== "ok") {
    redirect(status === "expired" ? "/mafia/login?expired=1" : "/mafia/login");
  }

  return (
    <div className="admin-light">
      <AdminHeader />
      <main className="container">{children}</main>
    </div>
  );
}
