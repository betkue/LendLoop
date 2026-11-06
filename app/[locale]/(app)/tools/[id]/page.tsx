import type { Id } from "@/convex/_generated/dataModel";
import { ToolPage } from "./tool-page";

export default async function ToolDetailPage({ params }: PageProps<"/[locale]/tools/[id]">) {
  const { id } = await params;
  return <ToolPage toolId={id as Id<"tools">} />;
}
