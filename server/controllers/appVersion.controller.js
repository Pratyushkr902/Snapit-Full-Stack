// Server-side App Version & In-App Update Controller
export const getAppVersionController = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      error: false,
      data: {
        latestVersion: "2.6.51",
        latestVersionCode: 91,
        minRequiredVersionCode: 90,
        forceUpdate: true,
        remindIntervalHours: 1,
        playStoreUrl: "https://play.google.com/store/apps/details?id=com.snapit.grocery",
        directApkUrl: "https://snapit-ashy.vercel.app/app-release.apk",
        title: "Critical Update Available 🚀",
        message: "A new version of Snapit (v2.6.51) is ready with 100% Free Delivery, live Himalaya Medical College Campus ordering, and instant checkout fixes!",
        releaseNotes: [
          "🛵 100% Free Delivery on ₹149+ (Paliganj) & ₹199+ (Himalaya College)",
          "🎓 Live Himalaya Medical College location switcher with zero surcharge",
          "⚡ Instant 5-second mobile phone + PIN login & registration",
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
