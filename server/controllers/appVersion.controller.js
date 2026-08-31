// Server-side App Version & In-App Update Controller
export const getAppVersionController = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      error: false,
      data: {
        latestVersion: "2.6.40",
        latestVersionCode: 79,
        minRequiredVersionCode: 79,
        forceUpdate: false,
        playStoreUrl: "https://play.google.com/store/apps/details?id=com.snapit.grocery",
        directApkUrl: "https://snapit-ashy.vercel.app/app-release.apk",
        title: "Update Available 🚀",
        message: "A new version of Snapit (v2.6.40) is ready with 365-day persistent login and Up to 60% OFF coupon engine!",
        releaseNotes: [
          "🔐 365-Day Persistent Session (No more logout on app updates)",
          "🎟️ Up to 60% OFF Promotional Coupon Engine",
          "⚡ Instant OTP login with zero network latency",
          "🖼️ Optimized crisp responsive hero banner"
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
