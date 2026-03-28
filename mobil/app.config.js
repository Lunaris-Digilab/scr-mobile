// Single Expo config (no app.json). Plugins resolved from project root for npx/EAS.
const projectRoot = __dirname;

function requirePlugin(id) {
  const mod = require(require.resolve(id, { paths: [projectRoot] }));
  return mod?.default ?? mod;
}

module.exports = {
  expo: {
    name: "glowist",
    slug: "glowist",
    scheme: "glowist",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.anonymous.glowist",
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff",
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: "com.anonymous.glowist",
    },
    web: { favicon: "./assets/favicon.png" },
    plugins: [
      requirePlugin("expo-router/app.plugin"),
      requirePlugin("expo-secure-store/app.plugin"),
      [
        requirePlugin("@react-native-google-signin/google-signin/app.plugin.js"),
        { iosUrlScheme: "com.googleusercontent.apps.838895646158-uqtknhlnhga5vmqa6n6pn0u97qslb7en" },
      ],
    ],
    extra: {
      router: {},
      eas: { projectId: "0ba9c574-6405-4030-89cb-db7504b7b784" },
    },
  },
  owner: "lunarisdigilab",
};
