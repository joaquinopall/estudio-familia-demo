/** Instant loading state of /admin/consultas/[id]: streams in after requireStaff() and the query. */
import { adminPanelContent } from "@/content/admin-panel";
import { PanelLoading } from "@/features/inquiries/components/panel-loading";

export default function InquiryDetailLoading() {
  return <PanelLoading label={adminPanelContent.detail.loading} />;
}
