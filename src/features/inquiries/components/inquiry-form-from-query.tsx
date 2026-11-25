"use client";

/**
 * Reads ?area=<slug> on the client and preselects that area in the form (SPEC §11.3). Kept on
 * the client so /contacto stays static (SPEC v1.9); it must render inside <Suspense>.
 * An unknown slug is ignored.
 */
import { useSearchParams } from "next/navigation";

import type { PracticeArea } from "../types";
import { InquiryForm, type InquiryFormProps } from "./inquiry-form";

type InquiryFormFromQueryProps = Omit<InquiryFormProps, "defaultArea"> & {
  /** Slug of each area page → its PracticeArea (built on the server from practice-areas.ts). */
  areaBySlug: Readonly<Record<string, PracticeArea>>;
};

export function InquiryFormFromQuery({ areaBySlug, ...props }: InquiryFormFromQueryProps) {
  const slug = useSearchParams().get("area");
  const defaultArea = slug && Object.hasOwn(areaBySlug, slug) ? areaBySlug[slug] : undefined;
  return <InquiryForm {...props} defaultArea={defaultArea} />;
}
