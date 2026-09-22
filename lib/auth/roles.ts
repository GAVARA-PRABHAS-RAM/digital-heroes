export type UserRole = "subscriber" | "admin";

export interface RolePermissions {
  canSubmitScores: boolean;
  canSelectCharity: boolean;
  canViewDraws: boolean;
  canClaimWinnings: boolean;
  canManageUsers: boolean;
  canManageDraws: boolean;
  canManageCharities: boolean;
  canVerifyWinners: boolean;
  canManagePayouts: boolean;
  canViewReports: boolean;
}

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  subscriber: {
    canSubmitScores: true,
    canSelectCharity: true,
    canViewDraws: true,
    canClaimWinnings: true,
    canManageUsers: false,
    canManageDraws: false,
    canManageCharities: false,
    canVerifyWinners: false,
    canManagePayouts: false,
    canViewReports: false,
  },
  admin: {
    canSubmitScores: true,
    canSelectCharity: true,
    canViewDraws: true,
    canClaimWinnings: true,
    canManageUsers: true,
    canManageDraws: true,
    canManageCharities: true,
    canVerifyWinners: true,
    canManagePayouts: true,
    canViewReports: true,
  },
};

/**
 * Validates if the given string is a recognized user role.
 */
export function isValidRole(role: unknown): role is UserRole {
  return role === "subscriber" || role === "admin";
}

/**
 * Checks whether a given role has a specific permission.
 */
export function hasPermission(role: UserRole | null | undefined, permission: keyof RolePermissions): boolean {
  if (!role || !isValidRole(role)) return false;
  return ROLE_PERMISSIONS[role][permission];
}
