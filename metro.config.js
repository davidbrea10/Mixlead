const { getDefaultConfig } = require("expo/metro-config");

module.exports = (async () => {
  const config = await getDefaultConfig(__dirname);
  console.log(
    "Default unstable_enablePackageExports:",
    config.resolver.unstable_enablePackageExports,
  );
  console.log(
    "Default unstable_enableSymlinks:",
    config.resolver.unstable_enableSymlinks,
  );

  config.resolver.unstable_enablePackageExports = false;
  // config.resolver.unstable_enableSymlinks = false;

  return config;
})();
