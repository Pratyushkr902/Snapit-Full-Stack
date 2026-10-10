import SystemConfigModel from '../models/systemConfig.model.js';

// Server-side App Version & In-App Update Controller
export const getAppVersionController = async (req, res) => {
  try {
    // Check if dynamic config is stored in MongoDB
    const dynamicConfig = await SystemConfigModel.findOne({ key: 'app_version_config' }).lean().catch(() => null);

    const defaultConfig = {
      enabled: false, // Default to false so updated users do not get spammed
      latestVersion: "2.6.64",
      latestVersionCode: 104,
      minRequiredVersionCode: 100,
      forceUpdate: false,
      remindIntervalHours: 24,
      playStoreUrl: "https://play.google.com/store/apps/details?id=com.snapit.grocery",
      directApkUrl: "https://snapit-ashy.vercel.app/app-release.apk",
      title: "New Snapit Update Available! 🚀",
      message: "A new version of Snapit is available on Google Play Store!",
      releaseNotes: [
        "🎁 Refer & Earn with instant coin rewards & tracker",
        "🪙 Daily check-in coins & 1-tap wallet conversion",
        "⚡ Ultra-fast performance and smoother navigation",
        "🔒 Bug fixes, stability & performance improvements"
      ]
    };

    const finalData = dynamicConfig?.value ? { ...defaultConfig, ...dynamicConfig.value } : defaultConfig;

    return res.status(200).json({
      success: true,
      error: false,
      data: finalData
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Failed to fetch app version",
      error: true,
      success: false
    });
  }
};

// Admin Controller to update version config in MongoDB on the fly
export const updateAppVersionConfigController = async (req, res) => {
  try {
    const { enabled, latestVersion, latestVersionCode, minRequiredVersionCode, forceUpdate, remindIntervalHours } = req.body;
    
    const update = {
      enabled: Boolean(enabled),
      ...(latestVersion && { latestVersion: String(latestVersion) }),
      ...(latestVersionCode && { latestVersionCode: Number(latestVersionCode) }),
      ...(minRequiredVersionCode && { minRequiredVersionCode: Number(minRequiredVersionCode) }),
      ...(forceUpdate !== undefined && { forceUpdate: Boolean(forceUpdate) }),
      ...(remindIntervalHours && { remindIntervalHours: Number(remindIntervalHours) })
    };

    await SystemConfigModel.findOneAndUpdate(
      { key: 'app_version_config' },
      { $set: { value: update, updatedByName: req.user?.name || 'Admin' } },
      { upsert: true, new: true }
    );

    return res.status(200).json({
      success: true,
      message: "App version config updated successfully",
      data: update
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Failed to update app version config",
      error: true,
      success: false
    });
  }
};
