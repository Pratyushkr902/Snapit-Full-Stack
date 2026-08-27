// Server-side App Version & In-App Update Controller
export const getAppVersionController = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      error: false,
      data: {
        latestVersion: "2.6.25",
        latestVersionCode: 64,
        minRequiredVersionCode: 55,
        forceUpdate: false,
        playStoreUrl: "https://play.google.com/store/apps/details?id=com.snapit.grocery",
        directApkUrl: "https://snapit.pages.dev/app-release.apk",
        title: "🚀 Update Available!",
        message: "A new version of Snapit is ready with important improvements and new features.",
        releaseNotes: [
          "🍽️ Single Restaurant Ordering (Zomato style)",
          "🌙 7:30 PM Evening Delivery Safety Cutoff (>5km)",
          "⚡ Faster checkout & live order tracking",
          "💰 Real-Time App Wallet & COD Treasury"
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
