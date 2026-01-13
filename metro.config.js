const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Exclude the backend 'functions' directory to prevent Metro crashes/core dumps
config.resolver.blockList = [
    ...(config.resolver.blockList || []),
    new RegExp(`^${path.resolve(__dirname, 'functions')}/.*`),
];

module.exports = withNativeWind(config, { input: './global.css' });
