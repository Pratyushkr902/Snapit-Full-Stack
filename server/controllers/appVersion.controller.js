// Server-side App Version & In-App Update Controller
export const getAppVersionController = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      error: false,
      data: {
        latestVersion: "2.6.33",
        latestVersionCode: 72,
        minRequiredVersionCode: 72,
        forceUpdate: true,
        playStoreUrl: "https://play.google.com/store/apps/details?id=com.snapit.grocery",
        directApkUrl: "https://snapit.pages.dev/app-release.apk",
        title: "Update Available 🚀",
        message: "A new version of Snapit (v2.6.31) is ready with faster 10-minute delivery, smart search & new features!",
        releaseNotes: [
          "⚡ Faster 10-Minute Delivery & Order Tracking",
          "🔍 Blinkit/Zepto-Grade Smart Voice Search & Hindi Filters",
          "🔔 Multi-Device Live Push Notifications & Alerts",
          "🍕 Improved Speed, Performance & Stability"
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
