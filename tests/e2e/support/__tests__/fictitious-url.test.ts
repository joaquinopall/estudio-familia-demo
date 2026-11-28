import { describe, expect, it } from "vitest";

import { isFictitiousUrl } from "../fictitious-url";

describe("isFictitiousUrl (F5-06)", () => {
  it.each([
    "postgresql://ci:ci@db.invalid:6543/postgres",
    "https://ci-project.supabase.invalid",
    "https://ci.upstash.invalid",
    "http://invalid",
    undefined,
    "",
    "not a url",
  ])("treats %s as fictitious: the dev services are not there", (url) => {
    expect(isFictitiousUrl(url)).toBe(true);
  });

  it.each([
    "postgresql://postgres.ref:pass@aws-0-us-east-2.pooler.supabase.com:6543/postgres",
    "https://abcdefgh.supabase.co",
    "https://invalid-looking.example.com",
  ])("treats %s as real", (url) => {
    expect(isFictitiousUrl(url)).toBe(false);
  });
});
