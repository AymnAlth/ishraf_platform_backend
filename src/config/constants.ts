export const ROLE_VALUES = [
  "admin",
  "parent",
  "teacher",
  "supervisor",
  "driver"
] as const;

export type Role = (typeof ROLE_VALUES)[number];

export const TOKEN_TYPES = {
  ACCESS: "access",
  REFRESH: "refresh"
} as const;
