/**
 * /admin/login (US-06 CA1, FR-10, SPEC §6.4). The form is part of the static shell, so it is
 * never replaced while someone types. Only LoginSessionCheck waits for the request (cookies
 * and ?error=), inside <Suspense> as Cache Components requires.
 */
import type { Metadata } from "next";
import { Suspense } from "react";

import { adminPanelContent } from "@/content/admin-panel";
import { LoginForm } from "@/features/auth/components/login-form";
import { LoginSessionCheck } from "@/features/auth/components/login-session-check";

const copy = adminPanelContent.login;

export const metadata: Metadata = { title: copy.metaTitle };

export default function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  return (
    <main id="contenido" className="flex flex-1 items-start justify-center px-6 py-12 sm:py-16">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl">{copy.title}</h1>
        <p className="mt-2 text-muted-foreground">{copy.lead}</p>
        <div className="mt-6 grid gap-6">
          <Suspense fallback={null}>
            <LoginSessionCheck searchParams={searchParams} />
          </Suspense>
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
