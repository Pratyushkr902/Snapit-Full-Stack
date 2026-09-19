// Server-side App Version & In-App Update Controller
export const getAppVersionController = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      error: false,
      data: {
        enabled: true,
        latestVersion: "2.6.59",
        latestVersionCode: 99,
        minRequiredVersionCode: 96,
        forceUpdate: false,
        remindIntervalHours: 1,
        playStoreUrl: "https://play.google.com/store/apps/details?id=com.snapit.grocery",
        directApkUrl: "https://snapit-ashy.vercel.app/app-release.apk",
        title: "New Snapit Update Available! 🚀",
        message: "A new version of Snapit (v2.6.59) is available with rock-solid stability fixes, smooth launch, and Android 15 support!",
        releaseNotes: [
          "🛠️ Fixed app launch crash ('Snapit keeps stopping')",
          "📱 Full Android 15 Edge-to-Edge Display Support",
          "⚡ Ultra-fast performance and smoother navigation",
          "🔒 Security updates and bug fixes"
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
