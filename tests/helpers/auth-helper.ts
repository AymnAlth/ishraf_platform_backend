import { AUTH_TEST_FIXTURES } from "../fixtures/auth.fixture";
import { SEEDED_DRIVER, SEEDED_SUPERVISOR } from "../setup/seed-test-data";
import { api } from "./app-helper";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

const toTokens = (response: { status: number; body: { data?: { tokens?: AuthTokens } } }, label: string): AuthTokens => {
  if (response.status !== 200 || !response.body.data?.tokens) {
    throw new Error(`${label} login failed with status ${response.status}`);
  }

  return {
    accessToken: response.body.data.tokens.accessToken,
    refreshToken: response.body.data.tokens.refreshToken
  };
};

export const login = (identifier: string, password: string) =>
  api().post("/api/v1/auth/login").send({
    identifier,
    password
  });

export const loginAsAdmin = async (): Promise<AuthTokens> =>
  toTokens(
    await login(AUTH_TEST_FIXTURES.activeEmailUser.email, AUTH_TEST_FIXTURES.activeEmailUser.password),
    "Admin"
  );

export const loginAsTeacher = async (): Promise<AuthTokens> =>
  toTokens(
    await login(AUTH_TEST_FIXTURES.activePhoneUser.email, AUTH_TEST_FIXTURES.activePhoneUser.password),
    "Teacher"
  );

export const loginAsSupervisor = async (): Promise<AuthTokens> =>
  toTokens(await login(SEEDED_SUPERVISOR.email, SEEDED_SUPERVISOR.password), "Supervisor");

export const loginAsDriver = async (): Promise<AuthTokens> =>
  toTokens(await login(SEEDED_DRIVER.email, SEEDED_DRIVER.password), "Driver");
