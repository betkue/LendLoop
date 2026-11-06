"use client";

import { useCallback } from "react";
import { useMutation } from "convex/react";
import { useTranslations } from "next-intl";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { TOOL_IMAGE_MAX_BYTES, TOOL_IMAGE_TYPES } from "@/convex/shared/constants";
import { useSafeMutation } from "@/hooks/use-safe-mutation";

export class PhotoError extends Error {
  constructor(public readonly reason: "photoType" | "photoSize" | "upload") {
    super(reason);
  }
}

/** Create, update and delete listings, with toasts handled by useSafeMutation. */
export function useToolMutations() {
  const t = useTranslations("tools");
  const create = useSafeMutation(api.tools.create, { successMessage: t("form.created") });
  const update = useSafeMutation(api.tools.update, { successMessage: t("form.updated") });
  const remove = useSafeMutation(api.tools.remove, { successMessage: t("listings.deleted") });
  const generateUploadUrl = useMutation(api.tools.generateUploadUrl);

  /**
   * Checks the file in the browser (same rules as Convex), uploads it to Convex
   * storage and returns its storage id.
   */
  const uploadPhoto = useCallback(
    async (file: File): Promise<Id<"_storage">> => {
      if (!(TOOL_IMAGE_TYPES as readonly string[]).includes(file.type)) throw new PhotoError("photoType");
      if (file.size > TOOL_IMAGE_MAX_BYTES) throw new PhotoError("photoSize");

      const uploadUrl = await generateUploadUrl();
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!response.ok) throw new PhotoError("upload");
      const { storageId } = (await response.json()) as { storageId: Id<"_storage"> };
      return storageId;
    },
    [generateUploadUrl],
  );

  return { create, update, remove, uploadPhoto };
}
