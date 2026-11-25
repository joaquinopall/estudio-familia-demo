/** In-memory StaffRepository for tests (SPEC §13: services tested with fakes). */
import type { NewStaffRecord, StaffRepository } from "@/features/auth/staff-service";
import type { AuthUser, StaffMember } from "@/features/auth/types";

export class FakeStaffRepository implements StaffRepository {
  readonly members: StaffMember[] = [];
  readonly authUsers: AuthUser[] = [];
  private failure: Error | null = null;
  private nextId = 1;

  /** Makes every next call throw, like a database outage. */
  failWith(error: Error | null): void {
    this.failure = error;
  }

  addAuthUser(user: AuthUser): this {
    this.authUsers.push(user);
    return this;
  }

  addMember(member: Partial<StaffMember> & Pick<StaffMember, "authUserId">): StaffMember {
    const full: StaffMember = {
      id: `staff-${this.nextId++}`,
      email: "staff@example.com",
      fullName: "Staff de prueba",
      role: "ADMIN",
      active: true,
      ...member,
    };
    this.members.push(full);
    return full;
  }

  private check(): void {
    if (this.failure) throw this.failure;
  }

  async findByAuthUserId(authUserId: string): Promise<StaffMember | null> {
    this.check();
    return this.members.find((member) => member.authUserId === authUserId) ?? null;
  }

  async findAuthUserByEmail(email: string): Promise<AuthUser | null> {
    this.check();
    return this.authUsers.find((user) => user.email.toLowerCase() === email.toLowerCase()) ?? null;
  }

  async create(record: NewStaffRecord): Promise<StaffMember> {
    this.check();
    return this.addMember(record);
  }

  async reactivate(id: string, changes: { email: string; fullName: string }): Promise<StaffMember> {
    this.check();
    const member = this.members.find((candidate) => candidate.id === id);
    if (!member) throw new Error("not found");
    Object.assign(member, changes, { active: true });
    return { ...member };
  }
}
