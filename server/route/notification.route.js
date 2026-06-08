import express from "express";
import Notification from "../models/notification.model.js";

const router = express.Router();

// Get all notifications for a recipient
router.get("/", async (req, res) => {
  try {
    const { recipientId, recipientType } = req.query;
    const notifications = await Notification.find({ recipientId, recipientType })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ success: true, data: notifications });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get unread count
router.get("/unread-count", async (req, res) => {
  try {
    const { recipientId, recipientType } = req.query;
    const count = await Notification.countDocuments({
      recipientId,
      recipientType,
      isRead: false,
    });
    res.json({ success: true, count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark a single notification as read
router.patch("/:id/read", async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { new: true }
    );
    res.json({ success: true, data: notification });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark all notifications as read
router.patch("/mark-all-read", async (req, res) => {
  try {
    const { recipientId, recipientType } = req.body;
    await Notification.updateMany(
      { recipientId, recipientType, isRead: false },
      { isRead: true }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a single notification
router.delete("/:id", async (req, res) => {
  try {
    await Notification.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Clear all notifications
router.delete("/clear-all", async (req, res) => {
  try {
    const { recipientId, recipientType } = req.body;
    const result = await Notification.deleteMany({ recipientId, recipientType });
    res.json({ success: true, deletedCount: result.deletedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;