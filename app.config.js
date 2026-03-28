const appJson = require('./app.json');
const path = require('path');
const fs = require('fs');

/** Google Maps API key desde .env (variable: google_maps) */
const googleMapsApiKey = process.env.google_maps || process.env.EXPO_PUBLIC_GOOGLE_MAPS || '';

const withGoogleMaps = require('./plugins/withGoogleMaps');

const versionPath = path.resolve(__dirname, 'version.json');
let version = '1.0.0';
let build = 1;
if (fs.existsSync(versionPath)) {
  const v = JSON.parse(fs.readFileSync(versionPath, 'utf8'));
  version = v.version || version;
  build = typeof v.build === 'number' ? v.build : parseInt(v.build, 10) || 1;
}

module.exports = {
  ...appJson,
  expo: {
    ...appJson.expo,
    version,
    plugins: [
      'expo-secure-store',
      ...(appJson.expo.plugins || []),
      ...(googleMapsApiKey ? [withGoogleMaps({ apiKey: googleMapsApiKey })] : []),
    ],
    android: {
      ...appJson.expo.android,
      versionCode: build,
    },
    ios: {
      ...appJson.expo.ios,
      bundleIdentifier: 'com.shatec.link4deal',
      buildNumber: String(build),
    },
  },
};
