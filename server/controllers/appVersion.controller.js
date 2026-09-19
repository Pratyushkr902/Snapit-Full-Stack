// Server-side App Version & In-App Update Controller
export const getAppVersionController = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      error: false,
      data: {
        enabled: true,
        latestVersion: "2.6.58",
        latestVersionCode: 98,
        minRequiredVersionCode: 96,
        forceUpdate: false,
        remindIntervalHours: 1,
        playStoreUrl: "https://play.google.com/store/apps/details?id=com.snapit.grocery",
        directApkUrl: "https://snapit-ashy.vercel.app/app-release.apk",
        title: "New Snapit Update Available! 🚀",
        message: "A new version of Snapit (v2.6.58) is available with Android 15 edge-to-edge support, performance boosts, and bug fixes!",
        releaseNotes: [
          "📱 Full Android 15 Edge-to-Edge Display Support",
          "⚡ Ultra-fast performance and smoother navigation",
          "🛵 100% Free Delivery on ₹149+ (Paliganj) & ₹199+ (Himalaya College)",
          "🔒 Bug fixes, stability improvements, and security updates"
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
