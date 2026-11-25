// @vitest-environment node
import { describe, expect, it } from "vitest";

import { addStaffMember } from "@/features/auth/staff-service";

import { FakeStaffRepository } from "./fake-staff-repository";

const AUTH_USER = { id: "0b8f2a52-5f0e-4d2a-9c61-3a1b2c3d4e5f", email: "Titular@Example.com" };
const INPUT = { email: "titular@example.com", fullName: "Laura Gómez" };

describe("addStaffMember (staff:add, SPEC §7)", () => {
  it("fails without creating anything when the Auth user does not exist", async () => {
    const repository = new FakeStaffRepository();

    expect(await addStaffMember(INPUT, repository)).toEqual({ status: "auth_user_not_found" });
    expect(repository.members).toHaveLength(0);
  });

  it("creates an active ADMIN linked to the Auth user, with the Auth email in lowercase", async () => {
    const repository = new FakeStaffRepository().addAuthUser(AUTH_USER);

    const result = await addStaffMember(INPUT, repository);

    expect(result).toMatchObject({
      status: "created",
      member: {
        authUserId: AUTH_USER.id,
        email: "titular@example.com",
        fullName: "Laura Gómez",
        role: "ADMIN",
        active: true,
      },
    });
  });

  it("is idempotent: a second run updates the name and reactivates, never duplicates", async () => {
    const repository = new FakeStaffRepository().addAuthUser(AUTH_USER);
    const existing = repository.addMember({
      authUserId: AUTH_USER.id,
      fullName: "Nombre viejo",
      active: false,
    });

    const result = await addStaffMember(INPUT, repository);

    expect(result).toEqual({
      status: "updated",
      member: expect.objectContaining({ id: existing.id, fullName: "Laura Gómez", active: true }),
    });
    expect(repository.members).toHaveLength(1);
  });

  it("lets a database error reach the caller (the script reports it)", async () => {
    const repository = new FakeStaffRepository().addAuthUser(AUTH_USER);
    repository.failWith(new Error("db down"));

    await expect(addStaffMember(INPUT, repository)).rejects.toThrow("db down");
  });
});
