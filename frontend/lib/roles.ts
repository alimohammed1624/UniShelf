export const ROLE_STUDENT = 0;
export const ROLE_MODERATOR = 1;
export const ROLE_ADMIN = 2;
export const ROLE_SUPERADMIN = 3;

export const ROLE_OPTIONS = [
  { value: ROLE_STUDENT, label: 'Student' },
  { value: ROLE_MODERATOR, label: 'Moderator' },
  { value: ROLE_ADMIN, label: 'Admin' },
  { value: ROLE_SUPERADMIN, label: 'Super Admin' },
] as const;

export function getRoleLabel(role: number): string {
  return ROLE_OPTIONS.find((o) => o.value === role)?.label ?? 'Unknown';
}

/**
 * Whether the UI should offer account actions (suspend / restore / reset
 * password) on `targetRole`.
 *
 * This follows the chain of command rather than raw privilege: superadmins
 * look after admins, admins look after everyone below them. The API is
 * deliberately more permissive — it allows any strictly-lower role — so a
 * superadmin can still reach a student directly when they need to. This is
 * only about what the dashboards put in front of you.
 */
export function canManageAccount(actorRole: number, targetRole: number): boolean {
  if (targetRole >= actorRole) return false;
  if (actorRole >= ROLE_SUPERADMIN) return targetRole === ROLE_ADMIN;
  if (actorRole === ROLE_ADMIN) return targetRole < ROLE_ADMIN;
  return false;
}
