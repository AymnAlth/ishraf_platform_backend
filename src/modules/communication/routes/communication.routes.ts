import { Router } from "express";

import { validateRequest } from "../../../common/middlewares/validation.middleware";
import { asyncHandler } from "../../../common/utils/async-handler";
import type { CommunicationController } from "../controller/communication.controller";
import { communicationPolicies } from "../policies/communication.policy";
import {
  availableRecipientsQuerySchema,
  conversationQuerySchema,
  createAnnouncementSchema,
  createNotificationSchema,
  inboxQuerySchema,
  messageIdParamsSchema,
  notificationIdParamsSchema,
  notificationsQuerySchema,
  otherUserIdParamsSchema,
  sentQuerySchema,
  sendMessageSchema
} from "../validator/communication.validator";

export const createCommunicationRouter = (
  controller: CommunicationController
): Router => {
  const router = Router();

  router.get(
    "/recipients",
    ...communicationPolicies.messages,
    validateRequest({ query: availableRecipientsQuerySchema }),
    asyncHandler((req, res) => controller.listAvailableRecipients(req, res))
  );

  router.post(
    "/messages",
    ...communicationPolicies.messages,
    validateRequest({ body: sendMessageSchema }),
    asyncHandler((req, res) => controller.sendMessage(req, res))
  );

  router.get(
    "/messages/inbox",
    ...communicationPolicies.messages,
    validateRequest({ query: inboxQuerySchema }),
    asyncHandler((req, res) => controller.listInbox(req, res))
  );

  router.get(
    "/messages/sent",
    ...communicationPolicies.messages,
    validateRequest({ query: sentQuerySchema }),
    asyncHandler((req, res) => controller.listSent(req, res))
  );

  router.get(
    "/messages/conversations/:otherUserId",
    ...communicationPolicies.messages,
    validateRequest({
      params: otherUserIdParamsSchema,
      query: conversationQuerySchema
    }),
    asyncHandler((req, res) => controller.getConversation(req, res))
  );

  router.patch(
    "/messages/:messageId/read",
    ...communicationPolicies.messages,
    validateRequest({ params: messageIdParamsSchema }),
    asyncHandler((req, res) => controller.markMessageAsRead(req, res))
  );

  router.post(
    "/announcements",
    ...communicationPolicies.manageAnnouncements,
    validateRequest({ body: createAnnouncementSchema }),
    asyncHandler((req, res) => controller.createAnnouncement(req, res))
  );

  router.get(
    "/announcements",
    ...communicationPolicies.manageAnnouncements,
    asyncHandler((req, res) => controller.listAllAnnouncements(req, res))
  );

  router.get(
    "/announcements/active",
    ...communicationPolicies.readAnnouncements,
    asyncHandler((req, res) => controller.listActiveAnnouncementsFeed(req, res))
  );

  router.post(
    "/notifications",
    ...communicationPolicies.manageNotifications,
    validateRequest({ body: createNotificationSchema }),
    asyncHandler((req, res) => controller.createNotification(req, res))
  );

  router.get(
    "/notifications/me",
    ...communicationPolicies.readNotifications,
    validateRequest({ query: notificationsQuerySchema }),
    asyncHandler((req, res) => controller.listMyNotifications(req, res))
  );

  router.patch(
    "/notifications/:notificationId/read",
    ...communicationPolicies.readNotifications,
    validateRequest({ params: notificationIdParamsSchema }),
    asyncHandler((req, res) => controller.markNotificationAsRead(req, res))
  );

  return router;
};
