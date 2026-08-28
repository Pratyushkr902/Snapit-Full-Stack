// Server-side App Version & In-App Update Controller
export const getAppVersionController = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      error: false,
      data: {
        latestVersion: "2.6.30",
        latestVersionCode: 69,
        minRequiredVersionCode: 69,
        forceUpdate: true,
        playStoreUrl: "https://play.google.com/store/apps/details?id=com.snapit.grocery",
        directApkUrl: "https://snapit.pages.dev/app-release.apk",
        title: "Update Available",
        message: "A new version of Snapit is ready with new features and improved performance.",
        releaseNotes: [
          "New features added",
          "Improved app performance & speed",
          "Enhanced security & stability"
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
