const { withAndroidManifest } = require('@expo/config-plugins');
const { getMainApplication, addMetaDataItemToMainApplication } = require('@expo/config-plugins/build/android/Manifest');

/** Config plugin que añade la Google Maps API key al AndroidManifest */
function withGoogleMaps(options) {
  const { apiKey } = options || {};
  return (config) => {
    if (!apiKey) return config;
    return withAndroidManifest(config, (config) => {
      const mainApplication = getMainApplication(config.modResults);
      if (!mainApplication) return config;
      addMetaDataItemToMainApplication(mainApplication, 'com.google.android.geo.API_KEY', apiKey);
      return config;
    });
  };
}

module.exports = withGoogleMaps;
