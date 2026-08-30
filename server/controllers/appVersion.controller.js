// Server-side App Version & In-App Update Controller
export const getAppVersionController = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      error: false,
      data: {
        latestVersion: "2.6.37",
        latestVersionCode: 76,
        minRequiredVersionCode: 73,
        forceUpdate: true,
        playStoreUrl: "https://play.google.com/store/apps/details?id=com.snapit.grocery",
        directApkUrl: "https://snapit.pages.dev/app-release.apk",
        title: "Update Available 🚀",
        message: "A new version of Snapit (v2.6.37) is ready with faster delivery, 6-14km coverage & high-precision tracking!",
        releaseNotes: [
          "⚡ 6–14 km Tiered Long-Distance Delivery & Upsell Banners",
          "📍 High-Precision Live Rider GPS Engine",
          "🔔 Multi-Device Push Notifications & Live Sound Chimes",
          "🛡️ Android 15 Edge-to-Edge & R8 Performance Optimizations"
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
