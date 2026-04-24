import { Router } from "express";

import { validateRequest } from "../../../common/middlewares/validation.middleware";
import { asyncHandler } from "../../../common/utils/async-handler";
import type { CommunicationController } from "../controller/communication.controller";
import { communicationPolicies } from "../policies/communication.policy";
import {
  availableRecipientsQuerySchema,
  communicationDeviceIdParamsSchema,
  conversationQuerySchema,
  createAnnouncementSchema,
  createBulkNotificationSchema,
  createNotificationSchema,
  inboxQuerySchema,
  messageIdParamsSchema,
  notificationIdParamsSchema,
  notificationsQuerySchema,
  otherUserIdParamsSchema,
  registerCommunicationDeviceSchema,
  sendBulkMessageSchema,
  sentQuerySchema,
  sendMessageSchema,
  updateCommunicationDeviceSchema
} from "../validator/communication.validator";

export const createCommunicationRouter = (
  controller: CommunicationController
): Router => {
  const router = Router();

  router.post(
    "/devices",
    ...communicationPolicies.deviceRegistry,
    validateRequest({ body: registerCommunicationDeviceSchema }),
    asyncHandler((req, res) => controller.registerDevice(req, res))
  );

  router.patch(
    "/devices/:deviceId",
    ...communicationPolicies.deviceRegistry,
    validateRequest({
      params: communicationDeviceIdParamsSchema,
      body: updateCommunicationDeviceSchema
    }),
    asyncHandler((req, res) => controller.updateDevice(req, res))
  );

  router.delete(
    "/devices/:deviceId",
    ...communicationPolicies.deviceRegistry,
    validateRequest({ params: communicationDeviceIdParamsSchema }),
    asyncHandler((req, res) => controller.unregisterDevice(req, res))
  );

  router.get(
    "/recipients",
    ...communicationPolicies.messages,
    validateRequest({ query: availableRecipientsQuerySchema }),
    asyncHandler((req, res) => controller.listAvailableRecipients(req, res))
  );

  router.get(
    "/recipients/parent-contacts",
    ...communicationPolicies.messages,
    validateRequest({ query: availableRecipientsQuerySchema }),
    asyncHandler((req, res) => controller.listParentContactRecipients(req, res))
  );

  router.post(
    "/messages",
    ...communicationPolicies.messages,
    validateRequest({ body: sendMessageSchema }),
    asyncHandler((req, res) => controller.sendMessage(req, res))
  );

  router.post(
    "/messages/bulk",
    ...communicationPolicies.bulkMessages,
    validateRequest({ body: sendBulkMessageSchema }),
    asyncHandler((req, res) => controller.sendBulkMessages(req, res))
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

  router.post(
    "/notifications/bulk",
    ...communicationPolicies.bulkNotifications,
    validateRequest({ body: createBulkNotificationSchema }),
    asyncHandler((req, res) => controller.createBulkNotifications(req, res))
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
