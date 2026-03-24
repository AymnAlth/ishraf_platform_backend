export const AUTH_TEST_FIXTURES = {
  activeEmailUser: {
    id: "1001",
    fullName: "Sara Admin",
    email: "admin@example.com",
    phone: "01000000001",
    password: "Password123!",
    role: "admin"
  },
  activePhoneUser: {
    id: "1002",
    fullName: "Mona Teacher",
    email: "teacher@example.com",
    phone: "01000000002",
    password: "Teacher123!",
    role: "teacher"
  },
  inactiveUser: {
    id: "1003",
    fullName: "Huda Parent",
    email: "inactive@example.com",
    phone: "01000000003",
    password: "Inactive123!",
    role: "parent"
  }
} as const;
