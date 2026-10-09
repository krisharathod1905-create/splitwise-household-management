import Notification from "#models/notification.model.js";
import { asyncHandler, sendSuccess, paginate } from "#utils/utils.js";

export const getNotifications = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Notification.countDocuments({ userId: req.user._id }),
    Notification.countDocuments({ userId: req.user._id, status: "unread" }),
  ]);
  return sendSuccess(res, { notifications, unreadCount, pagination: { page, limit, total } });
});

export const markRead = asyncHandler(async (req, res) => {
  const { notificationId } = req.params;
  await Notification.findOneAndUpdate(
    { _id: notificationId, userId: req.user._id },
    { status: "read" }
  );
  return sendSuccess(res, null, "Notification marked as read.");
});

export const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ userId: req.user._id, status: "unread" }, { status: "read" });
  return sendSuccess(res, null, "All notifications marked as read.");
});
