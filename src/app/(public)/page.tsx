import { CtaLink } from "@/components/layout/cta-link";
import { siteConfig } from "@/config/site.config";

/** Home placeholder: the real content arrives in F2-02. */
export default function HomePage() {
  return (
    <section className="mx-auto flex max-w-3xl flex-col items-start gap-6 px-4 py-16 sm:py-24">
      <h1 className="text-4xl font-semibold text-primary sm:text-5xl">{siteConfig.tagline}</h1>
      <p className="text-lg text-muted-foreground">{siteConfig.description}</p>
      <CtaLink href={siteConfig.primaryCta.href} size="lg">
        {siteConfig.primaryCta.label}
      </CtaLink>
    </section>
  );
}
