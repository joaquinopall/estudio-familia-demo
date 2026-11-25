/**
 * /admin/consultas/[id]: detail of one inquiry (US-06 CA3, FR-10). It calls requireStaff()
 * even though the layout does (NFR-SEC-02: every page). An id that is not a UUID, or does not
 * exist, shows the panel's 404 (not-found.tsx).
 */
import { notFound } from "next/navigation";
import { z } from "zod";

import { siteConfig } from "@/config/site.config";
import { requireStaff } from "@/features/auth/dal";
import { InquiryDetail } from "@/features/inquiries/components/inquiry-detail";
import { getInquiryService } from "@/features/inquiries/server";
import { logger } from "@/lib/logger";

const idSchema = z.uuid();

/** Logs only the error name and throws a bare error for the panel's error boundary. */
async function getOrFail(id: string) {
  try {
    return await getInquiryService().getInquiry(id);
  } catch (error) {
    logger.error("inquiry.detail_failed", { inquiryId: id, error });
    throw new Error("inquiry.detail_failed");
  }
}

export default async function InquiryDetailPage({ params }: PageProps<"/admin/consultas/[id]">) {
  await requireStaff();
  const parsed = idSchema.safeParse((await params).id);
  if (!parsed.success) notFound();

  const inquiry = await getOrFail(parsed.data);
  if (!inquiry) notFound();

  return (
    <main id="contenido" className="mx-auto w-full max-w-6xl px-6 py-10">
      <InquiryDetail inquiry={inquiry} timeZone={siteConfig.timeZone} />
    </main>
  );
}
