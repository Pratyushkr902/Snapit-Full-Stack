import express from "express";
import auth from "../middleware/auth.js";
import { admin } from "../middleware/Admin.js";
import Notification from "../models/notification.model.js";

const router = express.Router();

// SECURITY FIX: this file previously had ZERO auth on every route, and trusted
// a client-supplied recipientId/recipientType with no ownership check —
// meaning anyone (no login required) could read, mark-as-read, or delete ANY
// user's notifications just by guessing/passing an ID. Confirmed via audit
// that NotificationBell/NotificationCenter (the only frontend consumer) is
// currently unused/dead code, so this fix redesigns the contract safely:
// recipientId is now always derived server-side from the authenticated
// session, never trusted from the client, for 'user' and 'rider' types.
// 'admin' and 'store'/'seller' types require the admin role until a proper
// seller-ownership-verified endpoint exists.

function resolveRecipient(req, requestedType) {
  const type = requestedType || 'user';
  if (type === 'user' || type === 'rider') {
    return { recipientId: req.userId, recipientType: type, allowed: true };
  }
  if (type === 'admin') {
    return { recipientId: req.userId, recipientType: type, allowed: req.userRole === 'ADMIN' };
  }
  // store/seller: no ownership model wired yet — block until that exists.
  return { recipientId: null, recipientType: type, allowed: false };
}

// Get all notifications for the logged-in recipient
router.get("/", auth, async (req, res) => {
  try {
    const { recipientId, recipientType, allowed } = resolveRecipient(req, req.query.recipientType);
    if (!allowed) return res.status(403).json({ success: false, message: 'Access denied.' });

    const notifications = await Notification.find({ recipientId, recipientType })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ success: true, data: notifications });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get unread count
router.get("/unread-count", auth, async (req, res) => {
  try {
    const { recipientId, recipientType, allowed } = resolveRecipient(req, req.query.recipientType);
    if (!allowed) return res.status(403).json({ success: false, message: 'Access denied.' });

    const count = await Notification.countDocuments({ recipientId, recipientType, isRead: false });
    res.json({ success: true, count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark a single notification as read — only if it belongs to the requester
router.patch("/:id/read", auth, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) return res.status(404).json({ success: false, message: 'Not found.' });

    const { recipientId, recipientType, allowed } = resolveRecipient(req, notification.recipientType);
    if (!allowed || String(notification.recipientId) !== String(recipientId) || notification.recipientType !== recipientType) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    notification.isRead = true;
    await notification.save();
    res.json({ success: true, data: notification });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark all notifications as read for the logged-in recipient
router.patch("/mark-all-read", auth, async (req, res) => {
  try {
    const { recipientId, recipientType, allowed } = resolveRecipient(req, req.body.recipientType);
    if (!allowed) return res.status(403).json({ success: false, message: 'Access denied.' });

    await Notification.updateMany({ recipientId, recipientType, isRead: false }, { isRead: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a single notification — only if it belongs to the requester
router.delete("/:id", auth, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) return res.status(404).json({ success: false, message: 'Not found.' });

    const { recipientId, recipientType, allowed } = resolveRecipient(req, notification.recipientType);
    if (!allowed || String(notification.recipientId) !== String(recipientId) || notification.recipientType !== recipientType) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    await Notification.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Clear all notifications for the logged-in recipient
router.delete("/clear-all", auth, async (req, res) => {
  try {
    const { recipientId, recipientType, allowed } = resolveRecipient(req, req.body.recipientType);
    if (!allowed) return res.status(403).json({ success: false, message: 'Access denied.' });

    const result = await Notification.deleteMany({ recipientId, recipientType });
    res.json({ success: true, deletedCount: result.deletedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
