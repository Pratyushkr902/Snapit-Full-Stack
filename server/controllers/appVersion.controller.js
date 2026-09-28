// Server-side App Version & In-App Update Controller
export const getAppVersionController = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      error: false,
      data: {
        enabled: true,
        latestVersion: "2.6.64",
        latestVersionCode: 104,
        minRequiredVersionCode: 100,
        forceUpdate: false,
        remindIntervalHours: 1,
        playStoreUrl: "https://play.google.com/store/apps/details?id=com.snapit.grocery",
        directApkUrl: "https://snapit-ashy.vercel.app/app-release.apk",
        title: "New Snapit Update Available! 🚀",
        message: "A new version of Snapit (v2.6.64) is available with Refer & Earn enhancements, Coins rewards, and speed improvements!",
        releaseNotes: [
          "🎁 Refer & Earn with instant coin rewards & tracker",
          "🪙 Daily check-in coins & 1-tap wallet conversion",
          "⚡ Ultra-fast performance and smoother navigation",
          "🔒 Bug fixes, stability & performance improvements"
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
