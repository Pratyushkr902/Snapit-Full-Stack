// Server-side App Version & In-App Update Controller
export const getAppVersionController = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      error: false,
      data: {
        latestVersion: "2.6.49",
        latestVersionCode: 89,
        minRequiredVersionCode: 84,
        forceUpdate: false,
        remindIntervalHours: 1,
        playStoreUrl: "https://play.google.com/store/apps/details?id=com.snapit.grocery",
        directApkUrl: "https://snapit-ashy.vercel.app/app-release.apk",
        title: "Update Available 🚀",
        message: "A new version of Snapit (v2.6.49) is ready with precise road-distance delivery fee, high-accuracy GPS, and instant rider order sync!",
        releaseNotes: [
          "🚀 Zomato & Zepto standard precise road-distance fee calculation",
          "🧭 Enhanced doorstep GPS address resolution",
          "⚡ Supercharged Rider Command and order sync speed",
          "📱 Improved scrollable account navigation & fixed logout"
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
