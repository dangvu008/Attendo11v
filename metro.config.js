// Metro configuration
const path = require("path");

// Simple metro config with basic defaults
const config = {
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
    minifierConfig: {
      keep_classnames: true,
      keep_fnames: true,
      mangle: {
        keep_classnames: true,
        keep_fnames: true,
      },
    },
  },
  resolver: {
    assetExts: ["db", "png", "jpg", "jpeg", "gif", "webp", "ttf", "svg", "otf"],
    sourceExts: ["js", "jsx", "json", "ts", "tsx"],
  },
};

module.exports = config;
