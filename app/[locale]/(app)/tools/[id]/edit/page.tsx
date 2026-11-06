import type { Id } from "@/convex/_generated/dataModel";
import { ToolForm } from "@/features/tools";

export default async function EditToolPage({ params }: PageProps<"/[locale]/tools/[id]/edit">) {
  const { id } = await params;
  return <ToolForm mode="edit" toolId={id as Id<"tools">} />;
}
