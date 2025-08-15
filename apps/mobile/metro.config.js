const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const path = require('path');

// Get the default Metro config
const defaultConfig = getDefaultConfig(__dirname);

// Custom configuration
const config = {
  watchFolders: [
    path.resolve(__dirname, '../../packages'),
  ],
  resolver: {
    nodeModulesPaths: [
      path.resolve(__dirname, './node_modules'),
      path.resolve(__dirname, '../../node_modules'),
    ],
  },
};

module.exports = mergeConfig(defaultConfig, config);