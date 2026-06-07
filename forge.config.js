const path = require('path');

module.exports = {
  packagerConfig: {
    name: 'LogoTray',
    executableName: 'logotray',
    asar: true,
    icon: path.join(__dirname, 'assets/tray-icon'),
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-webpack',
      config: {
        mainConfig: './webpack.main.config.js',
        renderer: {
          config: './webpack.renderer.config.js',
          entryPoints: [
            {
              html: './src/renderer/index.html',
              js: './src/renderer/main.tsx',
              name: 'main_window',
            },
          ],
        },
      },
    },
  ],
};
