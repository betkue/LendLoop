import { AdaptiveShell } from "@/features/auth";

// Catalog pages (all tools, categories, search) are open to visitors.
export default function CatalogLayout({ children }: LayoutProps<"/[locale]">) {
  return <AdaptiveShell>{children}</AdaptiveShell>;
}
