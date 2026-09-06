// Server-side App Version & In-App Update Controller
export const getAppVersionController = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      error: false,
      data: {
        latestVersion: "2.6.43",
        latestVersionCode: 82,
        minRequiredVersionCode: 81,
        forceUpdate: false,
        playStoreUrl: "https://play.google.com/store/apps/details?id=com.snapit.grocery",
        directApkUrl: "https://snapit-ashy.vercel.app/app-release.apk",
        title: "Update Available 🚀",
        message: "A new version of Snapit (v2.6.43) is ready with enhanced order tracking and delivery optimizations!",
        releaseNotes: [
          "🔐 365-Day Persistent Session (No more logout on app updates)",
          "🎟️ Promotional Coupon & Deals Engine",
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
