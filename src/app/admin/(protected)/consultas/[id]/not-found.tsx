/**
 * 404 of an inquiry detail: an invalid or unknown id. Inside the panel, with a way back to the
 * list (the site's 404 would show the public shell).
 */
import Link from "next/link";

import { adminPanelContent } from "@/content/admin-panel";
import { adminPaths } from "@/lib/admin-paths";

const copy = adminPanelContent.detail;

export default function InquiryNotFound() {
  return (
    <main id="contenido" className="mx-auto grid w-full max-w-6xl gap-3 px-6 py-10">
      <h1 className="text-3xl">{copy.notFound.title}</h1>
      <p>{copy.notFound.body}</p>
      <p>
        <Link
          href={adminPaths.home}
          className="inline-flex min-h-11 items-center text-primary underline underline-offset-4"
        >
          {copy.backToList}
        </Link>
      </p>
    </main>
  );
}
