// Server-side App Version & In-App Update Controller
export const getAppVersionController = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      error: false,
      data: {
        latestVersion: "2.6.27",
        latestVersionCode: 66,
        minRequiredVersionCode: 65,
        forceUpdate: true,
        playStoreUrl: "https://play.google.com/store/apps/details?id=com.snapit.grocery",
        directApkUrl: "https://snapit.pages.dev/app-release.apk",
        title: "🚀 Update Available!",
        message: "A new version of Snapit is ready with important improvements, free food offers, and bug fixes.",
        releaseNotes: [
          "🍕 Free Margherita Pizza on orders above ₹599 (MGD Pizza Point)",
          "💳 Online Razorpay payments for all restaurant food orders",
          "🤝 Rider Cash Handover & UPI Dual Remittance",
          "🔔 Fast push notifications & live order tracking"
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
