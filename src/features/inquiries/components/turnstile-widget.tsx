"use client";

/**
 * Cloudflare Turnstile widget (SPEC §8.2, ADR-0004). Renders explicitly once the script loads
 * and adds the hidden `cf-turnstile-response` field to the form; the server verifies it.
 * The token is single use: when `resetKey` changes (after a failed submission), the widget
 * is reset to get a new one. No dependency: the script is Cloudflare's own.
 */
import Script from "next/script";
import { useCallback, useEffect, useRef } from "react";

const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type TurnstileApi = {
  render: (container: HTMLElement, options: Record<string, unknown>) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

type TurnstileWidgetProps = { siteKey: string; resetKey: number };

export function TurnstileWidget({ siteKey, resetKey }: TurnstileWidgetProps) {
  const container = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  const renderWidget = useCallback(() => {
    if (!window.turnstile || !container.current || widgetId.current) return;
    widgetId.current = window.turnstile.render(container.current, {
      sitekey: siteKey,
      language: "es",
      // The hidden input goes inside the form, with the name the action reads.
      "response-field-name": "cf-turnstile-response",
    });
  }, [siteKey]);

  // The script may already be loaded (navigation back to the page).
  useEffect(() => {
    renderWidget();
    return () => {
      if (widgetId.current) window.turnstile?.remove(widgetId.current);
      widgetId.current = null;
    };
  }, [renderWidget]);

  useEffect(() => {
    if (resetKey > 0 && widgetId.current) window.turnstile?.reset(widgetId.current);
  }, [resetKey]);

  return (
    <>
      <Script src={SCRIPT_URL} strategy="afterInteractive" onReady={renderWidget} />
      <div ref={container} className="min-h-[65px]" data-testid="turnstile" />
    </>
  );
}
