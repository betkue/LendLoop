import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-header";
import { AdminGuard, AdminNav } from "@/features/admin";
import { MemberShell } from "@/features/auth";

// Admin area: same frame as member pages, content shown to admins only.
export default async function AdminLayout({ children }: LayoutProps<"/[locale]">) {
  const t = await getTranslations("admin");
  return (
    <MemberShell>
      <AdminGuard>
        <div className="space-y-6">
          <PageHeader title={t("title")} description={t("subtitle")} />
          <AdminNav />
          {children}
        </div>
      </AdminGuard>
    </MemberShell>
  );
}
