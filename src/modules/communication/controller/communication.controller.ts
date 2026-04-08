import type { Request, Response } from "express";

import { buildSuccessResponse } from "../../../common/base/http-response";
import type { AuthenticatedUser } from "../../../common/types/auth.types";
import type {
  AvailableRecipientsQueryDto,
  CommunicationDeviceIdParamsDto,
  CommunicationMessageIdParamsDto,
  CommunicationNotificationIdParamsDto,
  CommunicationOtherUserIdParamsDto,
  ConversationQueryDto,
  CreateAnnouncementRequestDto,
  CreateBulkNotificationRequestDto,
  CreateNotificationRequestDto,
  InboxQueryDto,
  NotificationsQueryDto,
  RegisterCommunicationDeviceRequestDto,
  SendBulkMessageRequestDto,
  SendMessageRequestDto,
  SentQueryDto,
  UpdateCommunicationDeviceRequestDto
} from "../dto/communication.dto";
import type { CommunicationService } from "../service/communication.service";

const assertAuthUser = (req: Request): AuthenticatedUser => req.authUser as AuthenticatedUser;

export class CommunicationController {
  constructor(private readonly communicationService: CommunicationService) {}

  async listAvailableRecipients(req: Request, res: Response): Promise<void> {
    const query = req.validated?.query as AvailableRecipientsQueryDto;
    const response = await this.communicationService.listAvailableRecipients(
      assertAuthUser(req),
      query
    );
    res
      .status(200)
      .json(buildSuccessResponse("Available recipients returned successfully", response));
  }

  async sendMessage(req: Request, res: Response): Promise<void> {
    const payload = req.validated?.body as SendMessageRequestDto;
    const response = await this.communicationService.sendMessage(assertAuthUser(req), payload);
    res.status(201).json(buildSuccessResponse("Message sent successfully", response));
  }

  async sendBulkMessages(req: Request, res: Response): Promise<void> {
    const payload = req.validated?.body as SendBulkMessageRequestDto;
    const response = await this.communicationService.sendBulkMessages(
      assertAuthUser(req),
      payload
    );
    res
      .status(201)
      .json(buildSuccessResponse("Bulk messages delivered successfully", response));
  }

  async listInbox(req: Request, res: Response): Promise<void> {
    const query = req.validated?.query as InboxQueryDto;
    const response = await this.communicationService.listInbox(assertAuthUser(req), query);
    res.status(200).json(buildSuccessResponse("Inbox fetched successfully", response));
  }

  async listSent(req: Request, res: Response): Promise<void> {
    const query = req.validated?.query as SentQueryDto;
    const response = await this.communicationService.listSent(assertAuthUser(req), query);
    res.status(200).json(buildSuccessResponse("Sent messages fetched successfully", response));
  }

  async getConversation(req: Request, res: Response): Promise<void> {
    const params = req.validated?.params as CommunicationOtherUserIdParamsDto;
    const query = req.validated?.query as ConversationQueryDto;
    const response = await this.communicationService.getConversation(
      assertAuthUser(req),
      params.otherUserId,
      query
    );
    res.status(200).json(buildSuccessResponse("Conversation fetched successfully", response));
  }

  async markMessageAsRead(req: Request, res: Response): Promise<void> {
    const params = req.validated?.params as CommunicationMessageIdParamsDto;
    const response = await this.communicationService.markMessageAsRead(
      assertAuthUser(req),
      params.messageId
    );
    res.status(200).json(buildSuccessResponse("Message marked as read", response));
  }

  async createAnnouncement(req: Request, res: Response): Promise<void> {
    const payload = req.validated?.body as CreateAnnouncementRequestDto;
    const response = await this.communicationService.createAnnouncement(
      assertAuthUser(req),
      payload
    );
    res.status(201).json(buildSuccessResponse("Announcement created successfully", response));
  }

  async listAllAnnouncements(req: Request, res: Response): Promise<void> {
    const response = await this.communicationService.listAllAnnouncements(assertAuthUser(req));
    res.status(200).json(buildSuccessResponse("Announcements fetched successfully", response));
  }

  async listActiveAnnouncementsFeed(req: Request, res: Response): Promise<void> {
    const response = await this.communicationService.listActiveAnnouncementsFeed(
      assertAuthUser(req)
    );
    res.status(200).json(buildSuccessResponse("Active announcements fetched successfully", response));
  }

  async createNotification(req: Request, res: Response): Promise<void> {
    const payload = req.validated?.body as CreateNotificationRequestDto;
    const response = await this.communicationService.createNotification(
      assertAuthUser(req),
      payload
    );
    res.status(201).json(buildSuccessResponse("Notification created successfully", response));
  }

  async createBulkNotifications(req: Request, res: Response): Promise<void> {
    const payload = req.validated?.body as CreateBulkNotificationRequestDto;
    const response = await this.communicationService.createBulkNotifications(
      assertAuthUser(req),
      payload
    );
    res
      .status(201)
      .json(buildSuccessResponse("Bulk notifications delivered successfully", response));
  }

  async listMyNotifications(req: Request, res: Response): Promise<void> {
    const query = req.validated?.query as NotificationsQueryDto;
    const response = await this.communicationService.listMyNotifications(
      assertAuthUser(req),
      query
    );
    res.status(200).json(buildSuccessResponse("Notifications fetched successfully", response));
  }

  async markNotificationAsRead(req: Request, res: Response): Promise<void> {
    const params = req.validated?.params as CommunicationNotificationIdParamsDto;
    const response = await this.communicationService.markNotificationAsRead(
      assertAuthUser(req),
      params.notificationId
    );
    res.status(200).json(buildSuccessResponse("Notification marked as read", response));
  }

  async registerDevice(req: Request, res: Response): Promise<void> {
    const payload = req.validated?.body as RegisterCommunicationDeviceRequestDto;
    const response = await this.communicationService.registerDevice(assertAuthUser(req), payload);
    res.status(201).json(buildSuccessResponse("Device registered successfully", response));
  }

  async updateDevice(req: Request, res: Response): Promise<void> {
    const params = req.validated?.params as CommunicationDeviceIdParamsDto;
    const payload = req.validated?.body as UpdateCommunicationDeviceRequestDto;
    const response = await this.communicationService.updateDevice(
      assertAuthUser(req),
      params.deviceId,
      payload
    );
    res.status(200).json(buildSuccessResponse("Device updated successfully", response));
  }

  async unregisterDevice(req: Request, res: Response): Promise<void> {
    const params = req.validated?.params as CommunicationDeviceIdParamsDto;
    const response = await this.communicationService.unregisterDevice(
      assertAuthUser(req),
      params.deviceId
    );
    res.status(200).json(buildSuccessResponse("Device unregistered successfully", response));
  }
}
