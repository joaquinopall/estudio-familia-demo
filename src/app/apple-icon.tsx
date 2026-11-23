import { renderAppIcon } from "@/lib/seo/app-icon";

/** Home-screen icon (iOS "Agregar a inicio"). */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return renderAppIcon(size.width, { rounded: false });
}
