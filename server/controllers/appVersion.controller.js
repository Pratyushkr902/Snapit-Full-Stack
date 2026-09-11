// Server-side App Version & In-App Update Controller
export const getAppVersionController = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      error: false,
      data: {
        latestVersion: "2.6.50",
        latestVersionCode: 90,
        minRequiredVersionCode: 84,
        forceUpdate: false,
        remindIntervalHours: 1,
        playStoreUrl: "https://play.google.com/store/apps/details?id=com.snapit.grocery",
        directApkUrl: "https://snapit-ashy.vercel.app/app-release.apk",
        title: "Update Available 🚀",
        message: "A new version of Snapit (v2.6.50) is ready with instant 5-second mobile login, Pali Dih & Akhtiyarpur speed fix, and zero network errors!",
        releaseNotes: [
          "⚡ Instant 5-second mobile phone + PIN login & registration",
          "📍 Enhanced support for Pali Dih & Akhtiyarpur with auto-address pinning",
          "🌐 Ultra-resilient connection with zero network errors on mobile networks",
          "🚀 Faster order placement & instant checkout navigation"
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
