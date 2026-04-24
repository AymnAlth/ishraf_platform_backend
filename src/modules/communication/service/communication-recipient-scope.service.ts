import { ForbiddenError } from "../../../common/errors/forbidden-error";
import type { Queryable } from "../../../common/interfaces/queryable.interface";
import type { AuthenticatedUser } from "../../../common/types/auth.types";
import type { PaginatedData } from "../../../common/types/pagination.types";
import { toPaginatedData } from "../../../common/utils/pagination.util";
import { ProfileResolutionService } from "../../../common/services/profile-resolution.service";
import type {
  AvailableRecipientResponseDto,
  AvailableRecipientsQueryDto
} from "../dto/communication.dto";
import { toAvailableRecipientResponseDto } from "../mapper/communication.mapper";
import type { CommunicationRepository } from "../repository/communication.repository";

export const COMMUNICATION_RECIPIENT_SCOPE_VALUES = ["parent_contacts"] as const;

export type CommunicationRecipientScope =
  (typeof COMMUNICATION_RECIPIENT_SCOPE_VALUES)[number];

const buildParentScopeForbiddenError = (): ForbiddenError =>
  new ForbiddenError("This communication audience is only available to parent users");

const buildRecipientForbiddenError = (): ForbiddenError =>
  new ForbiddenError("You do not have permission to contact this user");

export class CommunicationRecipientScopeService {
  constructor(
    private readonly communicationRepository: CommunicationRepository,
    private readonly profileResolutionService: ProfileResolutionService = new ProfileResolutionService()
  ) {}

  async listRecipientsForScope(
    scope: CommunicationRecipientScope,
    authUser: AuthenticatedUser,
    query: AvailableRecipientsQueryDto
  ): Promise<PaginatedData<AvailableRecipientResponseDto>> {
    switch (scope) {
      case "parent_contacts":
        return this.listParentRecipients(authUser, query);
    }
  }

  async assertRecipientAllowedForScope(
    scope: CommunicationRecipientScope,
    authUser: AuthenticatedUser,
    recipientUserId: string,
    queryable?: Queryable
  ): Promise<void> {
    switch (scope) {
      case "parent_contacts":
        await this.assertParentRecipientAllowed(authUser, recipientUserId, queryable);
        return;
    }
  }

  private async listParentRecipients(
    authUser: AuthenticatedUser,
    query: AvailableRecipientsQueryDto
  ): Promise<PaginatedData<AvailableRecipientResponseDto>> {
    const parentProfile = await this.requireParentScopeProfile(authUser);
    const result = await this.communicationRepository.listParentScopedRecipients(
      parentProfile.parentId,
      query
    );

    return toPaginatedData(
      result.rows.map((row) => toAvailableRecipientResponseDto(row)),
      query.page,
      query.limit,
      result.totalItems
    );
  }

  private async assertParentRecipientAllowed(
    authUser: AuthenticatedUser,
    recipientUserId: string,
    queryable?: Queryable
  ): Promise<void> {
    const parentProfile = await this.requireParentScopeProfile(authUser, queryable);
    const recipientIds =
      await this.communicationRepository.listParentScopedRecipientIdsByUserIds(
        parentProfile.parentId,
        [recipientUserId],
        queryable
      );

    if (!recipientIds.includes(recipientUserId)) {
      throw buildRecipientForbiddenError();
    }
  }

  private async requireParentScopeProfile(
    authUser: AuthenticatedUser,
    queryable?: Queryable
  ) {
    if (authUser.role !== "parent") {
      throw buildParentScopeForbiddenError();
    }

    return this.profileResolutionService.requireParentProfile(authUser.userId, queryable);
  }
}
