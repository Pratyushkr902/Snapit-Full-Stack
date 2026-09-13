// Server-side App Version & In-App Update Controller
export const getAppVersionController = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      error: false,
      data: {
        enabled: false, // Set to true once Google Play approves and publishes v2.6.54
        latestVersion: "2.6.50",
        latestVersionCode: 90,
        minRequiredVersionCode: 90,
        forceUpdate: false,
        remindIntervalHours: 1,
        playStoreUrl: "https://play.google.com/store/apps/details?id=com.snapit.grocery",
        directApkUrl: "https://snapit-ashy.vercel.app/app-release.apk",
        title: "New Snapit Update Available! 🚀",
        message: "A new version of Snapit (v2.6.54) is available with fast image rendering, bug fixes, and performance improvements!",
        releaseNotes: [
          "⚡ Ultra-fast image rendering & smooth scrolling",
          "🛵 100% Free Delivery on ₹149+ (Paliganj) & ₹199+ (Himalaya College)",
          "🚀 2x faster app opening & offline image caching",
          "🔒 Bug fixes and stability improvements"
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
