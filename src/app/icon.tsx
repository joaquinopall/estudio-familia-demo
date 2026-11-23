import { renderAppIcon } from "@/lib/seo/app-icon";

/** Browser tab icon. /favicon.ico is rewritten here (next.config.ts). */
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return renderAppIcon(size.width, { rounded: true });
}
