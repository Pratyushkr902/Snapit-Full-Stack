// Server-side App Version & In-App Update Controller
export const getAppVersionController = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      error: false,
      data: {
        latestVersion: "2.6.48",
        latestVersionCode: 88,
        minRequiredVersionCode: 84,
        forceUpdate: false,
        remindIntervalHours: 1,
        playStoreUrl: "https://play.google.com/store/apps/details?id=com.snapit.grocery",
        directApkUrl: "https://snapit-ashy.vercel.app/app-release.apk",
        title: "Update Available 🚀",
        message: "A new version of Snapit (v2.6.48) is ready with critical stability, smooth launch fixes, and speed optimizations!",
        releaseNotes: [
          "🎯 High-Precision Doorstep GPS Delivery for Riders",
          "📱 Modern Edge-to-Edge & Notch-safe layout for Android 15",
          "🛒 Zepto/Blinkit-style mobile bottom sheet cart & address flows",
          "⚡ Supercharged app speed, GPU layer acceleration, and instant rendering"
        ]
      }
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Failed to fetch app version",
      error: true,
      success: false
    });
  }
};
