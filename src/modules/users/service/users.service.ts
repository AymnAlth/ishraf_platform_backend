import { NotFoundError } from "../../../common/errors/not-found-error";
import { ValidationError } from "../../../common/errors/validation-error";
import type { PaginatedData } from "../../../common/types/pagination.types";
import { toPaginatedData } from "../../../common/utils/pagination.util";
import { hashPassword } from "../../../common/utils/password.util";
import { db } from "../../../database/db";
import type { CreateUserRequestDto } from "../dto/create-user.dto";
import type { UserResponseDto } from "../dto/user-response.dto";
import type { UpdateUserRequestDto } from "../dto/update-user.dto";
import type { UpdateUserStatusRequestDto } from "../dto/update-user-status.dto";
import { toUserResponseDto } from "../mapper/users.mapper";
import type { UsersRepository } from "../repository/users.repository";
import type {
  ListUsersQuery,
  DriverStatus,
  ParentProfileInput,
  SupervisorProfileInput,
  TeacherProfileInput,
  UpdateUserBaseInput,
  UserWithProfileRow
} from "../types/users.types";

const buildRoleProfileValidationError = (
  role: UserWithProfileRow["role"],
  disallowedFields: string[]
): ValidationError =>
  new ValidationError("Profile fields do not match the user's role", [
    {
      field: "profile",
      code: "INVALID_PROFILE_FIELDS",
      message:
        disallowedFields.length > 0
          ? `Role ${role} does not accept: ${disallowedFields.join(", ")}`
          : `Role ${role} does not accept profile data`
    }
  ]);

const assertUserExists = (user: UserWithProfileRow | null): UserWithProfileRow => {
  if (!user) {
    throw new NotFoundError("User not found");
  }

  return user;
};

const assertProfileUpdated = (updated: boolean): void => {
  if (!updated) {
    throw new NotFoundError("User profile not found");
  }
};

const toBaseUpdateInput = (payload: UpdateUserRequestDto): UpdateUserBaseInput => ({
  fullName: payload.fullName,
  email: payload.email,
  phone: payload.phone
});

const toParentProfilePatch = (
  profile: UpdateUserRequestDto["profile"]
): Partial<ParentProfileInput> => ({
  address: profile?.address,
  relationType: profile?.relationType
});

const toTeacherProfilePatch = (
  profile: UpdateUserRequestDto["profile"]
): Partial<TeacherProfileInput> => ({
  specialization: profile?.specialization,
  qualification: profile?.qualification,
  hireDate: profile?.hireDate
});

const toSupervisorProfilePatch = (
  profile: UpdateUserRequestDto["profile"]
): Partial<SupervisorProfileInput> => ({
  department: profile?.department
});

const validateRoleSpecificProfile = (
  role: UserWithProfileRow["role"],
  profile: UpdateUserRequestDto["profile"]
): void => {
  if (!profile) {
    return;
  }

  const fieldsByRole: Record<UserWithProfileRow["role"], string[]> = {
    admin: [],
    parent: ["address", "relationType"],
    teacher: ["specialization", "qualification", "hireDate"],
    supervisor: ["department"],
    driver: ["licenseNumber", "driverStatus"]
  };

  const providedFields = Object.entries(profile)
    .filter(([, value]) => value !== undefined)
    .map(([key]) => key);
  const disallowedFields = providedFields.filter(
    (field) => !fieldsByRole[role].includes(field)
  );

  if (disallowedFields.length > 0 || (role === "admin" && providedFields.length > 0)) {
    throw buildRoleProfileValidationError(role, disallowedFields);
  }
};

const normalizeDriverStatus = (value: DriverStatus | undefined): DriverStatus | undefined =>
  value;

export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async createUser(payload: CreateUserRequestDto): Promise<UserResponseDto> {
    const passwordHash = await hashPassword(payload.password);

    const createdUser = await db.withTransaction(async (client) => {
      const userId = await this.usersRepository.createUser(
        {
          fullName: payload.fullName,
          email: payload.email ?? null,
          phone: payload.phone ?? null,
          passwordHash,
          role: payload.role
        },
        client
      );

      if (payload.role === "parent") {
        await this.usersRepository.createParentProfile(
          userId,
          {
            address: payload.profile.address ?? null,
            relationType: payload.profile.relationType ?? null
          },
          client
        );
      }

      if (payload.role === "teacher") {
        await this.usersRepository.createTeacherProfile(
          userId,
          {
            specialization: payload.profile.specialization ?? null,
            qualification: payload.profile.qualification ?? null,
            hireDate: payload.profile.hireDate ?? null
          },
          client
        );
      }

      if (payload.role === "supervisor") {
        await this.usersRepository.createSupervisorProfile(
          userId,
          {
            department: payload.profile.department ?? null
          },
          client
        );
      }

      if (payload.role === "driver") {
        await this.usersRepository.createDriverProfile(
          userId,
          {
            licenseNumber: payload.profile.licenseNumber,
            driverStatus: payload.profile.driverStatus ?? "active"
          },
          client
        );
      }

      return assertUserExists(await this.usersRepository.findUserById(userId, client));
    });

    return toUserResponseDto(createdUser);
  }

  async listUsers(query: ListUsersQuery): Promise<PaginatedData<UserResponseDto>> {
    const users = await this.usersRepository.listUsers(query);

    return toPaginatedData(
      users.rows.map((user) => toUserResponseDto(user)),
      query.page,
      query.limit,
      users.totalItems
    );
  }

  async getUserById(userId: string): Promise<UserResponseDto> {
    const user = assertUserExists(await this.usersRepository.findUserById(userId));

    return toUserResponseDto(user);
  }

  async updateUser(
    userId: string,
    payload: UpdateUserRequestDto
  ): Promise<UserResponseDto> {
    const updatedUser = await db.withTransaction(async (client) => {
      const existingUser = assertUserExists(
        await this.usersRepository.findUserById(userId, client)
      );

      validateRoleSpecificProfile(existingUser.role, payload.profile);

      await this.usersRepository.updateUserBase(userId, toBaseUpdateInput(payload), client);

      if (payload.profile) {
        if (existingUser.role === "parent") {
          assertProfileUpdated(
            await this.usersRepository.updateParentProfile(
              userId,
              toParentProfilePatch(payload.profile),
              client
            )
          );
        }

        if (existingUser.role === "teacher") {
          assertProfileUpdated(
            await this.usersRepository.updateTeacherProfile(
              userId,
              toTeacherProfilePatch(payload.profile),
              client
            )
          );
        }

        if (existingUser.role === "supervisor") {
          assertProfileUpdated(
            await this.usersRepository.updateSupervisorProfile(
              userId,
              toSupervisorProfilePatch(payload.profile),
              client
            )
          );
        }

        if (existingUser.role === "driver") {
          assertProfileUpdated(
            await this.usersRepository.updateDriverProfile(
              userId,
              {
                licenseNumber: payload.profile.licenseNumber,
                driverStatus: normalizeDriverStatus(payload.profile.driverStatus)
              },
              client
            )
          );
        }
      }

      return assertUserExists(await this.usersRepository.findUserById(userId, client));
    });

    return toUserResponseDto(updatedUser);
  }

  async updateUserStatus(
    userId: string,
    payload: UpdateUserStatusRequestDto
  ): Promise<UserResponseDto> {
    const updatedUser = await db.withTransaction(async (client) => {
      const existingUser = assertUserExists(
        await this.usersRepository.findUserById(userId, client)
      );

      await this.usersRepository.updateUserStatus(userId, payload.isActive, client);

      if (!payload.isActive) {
        await this.usersRepository.revokeAllUserRefreshTokens(userId, client);
      }

      return assertUserExists(await this.usersRepository.findUserById(existingUser.id, client));
    });

    return toUserResponseDto(updatedUser);
  }
}
