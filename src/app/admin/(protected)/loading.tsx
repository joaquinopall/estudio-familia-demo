/** Instant loading state of /admin (the list): streams in after requireStaff() and the query. */
import { adminPanelContent } from "@/content/admin-panel";
import { PanelLoading } from "@/features/inquiries/components/panel-loading";

export default function AdminInquiriesLoading() {
  return <PanelLoading label={adminPanelContent.list.loading} />;
}
