// Metro configuration
const { getDefaultConfig } = require("expo/metro-config");

// Get the default config
const config = getDefaultConfig(__dirname);

// Add any custom configurations here
config.resolver.assetExts.push("db");

// Add any additional configurations for better performance
config.transformer.minifierConfig = {
  keep_classnames: true,
  keep_fnames: true,
  mangle: {
    keep_classnames: true,
    keep_fnames: true,
  },
};

module.exports = config;
