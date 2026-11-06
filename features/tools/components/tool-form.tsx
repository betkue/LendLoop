"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { ImagePlusIcon, Loader2Icon, PackageXIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { PageTransition } from "@/components/shared/motion";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import type { Id } from "@/convex/_generated/dataModel";
import { CATEGORIES, CONDITIONS, TOOL_IMAGE_TYPES } from "@/convex/shared/constants";
import { Link, useRouter } from "@/i18n/navigation";
import { routes } from "@/lib/routes";
import { PhotoError, useToolMutations } from "../hooks/use-tool-mutations";
import { useTool } from "../hooks/use-tools";
import { makeToolFormSchema, type ToolFormValues } from "../schemas";
import type { ToolCardData } from "../types";

/** Create or edit a listing. In edit mode the tool is loaded first. */
export function ToolForm(props: { mode: "create" } | { mode: "edit"; toolId: Id<"tools"> }) {
  if (props.mode === "create") return <ToolFormInner />;
  return <EditToolForm toolId={props.toolId} />;
}

function EditToolForm({ toolId }: { toolId: Id<"tools"> }) {
  const t = useTranslations("tools");
  const tool = useTool(toolId);
  if (tool === undefined) return <Skeleton className="h-[32rem] rounded-xl" />;
  if (tool === null || !tool.isMine) {
    return (
      <ErrorState
        icon={PackageXIcon}
        title={t("detail.notFoundTitle")}
        action={
          <Button variant="outline" nativeButton={false} render={<Link href={routes.myListings} />}>
            {t("listings.title")}
          </Button>
        }
      />
    );
  }
  return <ToolFormInner tool={tool} />;
}

function ToolFormInner({ tool }: { tool?: ToolCardData }) {
  const t = useTranslations("tools");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const { create, update, uploadPhoto } = useToolMutations();
  const schema = useMemo(() => makeToolFormSchema((key) => t(`form.errors.${key}`)), [t]);

  const form = useForm<ToolFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: tool?.name ?? "",
      category: tool?.category ?? "diy",
      condition: tool?.condition ?? "good",
      description: tool?.description ?? "",
    },
  });

  // Photo state: a newly picked file, or whether the existing photo was removed.
  const [file, setFile] = useState<File | null>(null);
  const [removedPhoto, setRemovedPhoto] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);
  const shownPhoto = previewUrl ?? (removedPhoto ? null : (tool?.imageUrl ?? null));

  async function onSubmit(values: ToolFormValues) {
    let imageId: Id<"_storage"> | null | undefined = undefined;
    try {
      if (file) {
        setUploading(true);
        imageId = await uploadPhoto(file);
      } else if (removedPhoto) {
        imageId = null;
      }
    } catch (error) {
      toast.error(t(`form.errors.${error instanceof PhotoError ? error.reason : "upload"}`));
      return;
    } finally {
      setUploading(false);
    }

    if (tool) {
      const outcome = await update.mutate({ toolId: tool._id, ...values, ...(imageId !== undefined && { imageId }) });
      if (outcome.ok) router.push(routes.tool(tool._id));
    } else {
      const outcome = await create.mutate({ ...values, ...(imageId && { imageId }) });
      if (outcome.ok) router.push(routes.tool(outcome.value));
    }
  }

  const busy = uploading || create.isPending || update.isPending || form.formState.isSubmitting;
  const errors = form.formState.errors;

  return (
    <PageTransition className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        title={tool ? t("form.editTitle") : t("form.createTitle")}
        description={tool ? undefined : t("form.createSubtitle")}
      />

      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-8 md:grid-cols-[16rem_1fr]" noValidate>
        <div className="space-y-2">
          <Label>{t("form.photo")}</Label>
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-dashed bg-muted">
            {shownPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element -- local blob preview
              <img src={shownPhoto} alt="" className="size-full object-cover" />
            ) : (
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="flex size-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground"
              >
                <ImagePlusIcon className="size-8" aria-hidden="true" />
                {t("form.choosePhoto")}
              </button>
            )}
          </div>
          <input
            ref={fileInput}
            type="file"
            accept={TOOL_IMAGE_TYPES.join(",")}
            className="sr-only"
            aria-label={t("form.choosePhoto")}
            onChange={(event) => {
              const picked = event.target.files?.[0] ?? null;
              setFile(picked);
              if (picked) setRemovedPhoto(false);
              event.target.value = "";
            }}
          />
          <div className="flex gap-2">
            {shownPhoto && (
              <>
                <Button type="button" variant="outline" className="h-11 flex-1 sm:h-9" onClick={() => fileInput.current?.click()}>
                  {t("form.changePhoto")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-11 gap-1 sm:h-9"
                  onClick={() => {
                    setFile(null);
                    setRemovedPhoto(true);
                  }}
                >
                  <Trash2Icon aria-hidden="true" />
                  {t("form.removePhoto")}
                </Button>
              </>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{t("form.photoHint")}</p>
        </div>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="tool-name">{t("form.name")}</Label>
            <Input
              id="tool-name"
              placeholder={t("form.namePlaceholder")}
              aria-invalid={Boolean(errors.name)}
              className="h-11 sm:h-10"
              {...form.register("name")}
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tool-category">{t("form.category")}</Label>
              <Controller
                control={form.control}
                name="category"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(value) => field.onChange(value)}
                    items={Object.fromEntries(CATEGORIES.map((c) => [c, t(`categories.${c}`)]))}
                  >
                    <SelectTrigger id="tool-category" className="h-11 w-full sm:h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category}>
                          {t(`categories.${category}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tool-condition">{t("form.condition")}</Label>
              <Controller
                control={form.control}
                name="condition"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(value) => field.onChange(value)}
                    items={Object.fromEntries(CONDITIONS.map((c) => [c, t(`conditions.${c}`)]))}
                  >
                    <SelectTrigger id="tool-condition" className="h-11 w-full sm:h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONDITIONS.map((condition) => (
                        <SelectItem key={condition} value={condition}>
                          {t(`conditions.${condition}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tool-description">{t("form.description")}</Label>
            <Textarea
              id="tool-description"
              rows={5}
              placeholder={t("form.descriptionPlaceholder")}
              aria-invalid={Boolean(errors.description)}
              {...form.register("description")}
            />
            {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="h-11 sm:h-10"
              onClick={() => router.back()}
              disabled={busy}
            >
              {tCommon("cancel")}
            </Button>
            <Button type="submit" className="h-11 gap-2 sm:h-10" disabled={busy}>
              {busy && <Loader2Icon className="animate-spin" aria-hidden="true" />}
              {tool ? t("form.submitEdit") : t("form.submitCreate")}
            </Button>
          </div>
        </div>
      </form>
    </PageTransition>
  );
}
