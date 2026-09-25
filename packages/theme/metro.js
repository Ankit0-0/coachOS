const path = require('path');

// Lower-cased: Windows drive letters differ in case between Node and Metro.
const PACKAGE_DIR = (__dirname + path.sep).toLowerCase();

/**
 * pnpm gives this package its own node_modules, so a bare import from here
 * (react, react-native, expo-*) would bundle a second copy next to the app's.
 * Resolve those from the app instead.
 */
function withThemePackage(config, appDir) {
  const upstream = config.resolver.resolveRequest;
  const appOrigin = path.join(appDir, 'package.json');
  return {
    ...config,
    resolver: {
      ...config.resolver,
      resolveRequest(context, moduleName, platform) {
        const resolve = upstream ?? context.resolveRequest;
        const isBare = !moduleName.startsWith('.') && !path.isAbsolute(moduleName);
        if (isBare && context.originModulePath.toLowerCase().startsWith(PACKAGE_DIR)) {
          return resolve({ ...context, originModulePath: appOrigin }, moduleName, platform);
        }
        return resolve(context, moduleName, platform);
      },
    },
  };
}

module.exports = { withThemePackage };
