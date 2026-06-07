# LogoTray Development Setup

## Prerequisites

- Node.js 18+ (https://nodejs.org/)
- npm 10+ (comes with Node.js)
- macOS 10.13+ (for development and running)

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/luisborges-de/LogoTray.git
   cd LogoTray
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

## Development

### Start the Development App

```bash
npm start
```

This launches the app in development mode with hot reloading. The app will appear in your macOS menu bar.

### Build for Distribution

```bash
npm run make
```

This creates distributable packages (.dmg, .zip) in the `out/make` directory.

## Available Scripts

- `npm start` - Launch development app
- `npm run package` - Package the app for distribution
- `npm run make` - Create distributable installers
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix linting errors
- `npm run format` - Format code with Prettier
- `npm run type-check` - Run TypeScript type checking
- `npm test` - Run tests

## Project Structure

```
LogoTray/
├── src/
│   ├── main/              # Electron main process
│   │   ├── main.ts        # Main entry point
│   │   └── preload.ts     # Preload script for IPC
│   ├── renderer/          # React UI
│   │   ├── App.tsx        # Main app component
│   │   ├── components/    # React components
│   │   └── hooks/         # Custom React hooks
│   ├── services/          # Business logic
│   │   ├── api/           # API integrations
│   │   ├── cache/         # Caching system
│   │   └── drag/          # Drag & drop
│   └── types/             # TypeScript types
├── forge.config.js        # Electron Forge configuration
├── webpack.*.config.js    # Webpack build configuration
└── package.json           # Dependencies and scripts
```

## Technology Stack

- **Framework**: Electron 28.3.3
- **UI**: React 18 with TypeScript
- **Build Tool**: Electron Forge with Webpack
- **Styling**: Modern CSS with glassmorphism
- **State Management**: React Hooks
- **Database**: SQLite with better-sqlite3

## How It Works

### Architecture

**Main Process** (`src/main/main.ts`)
- Manages tray icon and menubar window
- Handles IPC communication with renderer
- Coordinates logo searches across multiple APIs
- Manages window lifecycle and drag-drop

**Renderer Process** (`src/renderer/`)
- React-based UI with modern components
- Real-time search with debouncing
- Virtualized grid for performance
- Accessible keyboard navigation

**Services** (`src/services/`)
- **APIManager**: Aggregates searches from multiple logo APIs
- **CacheManager**: SQLite-based local caching
- **DragHandler**: Native drag-and-drop functionality

### Logo Sources

- Logo.dev
- Brandfetch
- API Ninjas
- Wikidata
- IconHorse

## Development Tips

### Hot Reloading
The development server automatically reloads the UI when you save files in the `src/renderer` directory.

### Debugging
- Use Chrome DevTools by opening the app and pressing `Cmd + Shift + I`
- Console messages from both main and renderer processes are logged

### Keyboard Shortcuts
- `Cmd+K` - Focus search
- `Cmd+⌫` - Clear search
- `Esc` - Hide window
- `Cmd+Q` - Quit app

## API Keys (Optional)

Some logo sources support API keys for better rate limiting:
- Logo.dev: Set `LOGO_DEV_API_TOKEN` environment variable
- Brandfetch: Set `BRANDFETCH_API_KEY` environment variable
- API Ninjas: API key is configured in code

## Troubleshooting

### App won't start
1. Delete `node_modules` and `.webpack` directories
2. Run `npm install` again
3. Run `npm start`

### Compilation errors
1. Run `npm run type-check` to see TypeScript errors
2. Run `npm run lint` to check for linting issues
3. Run `npm run format` to auto-fix formatting

### Icon issues
The tray icon is generated programmatically. If it doesn't appear:
1. Check that `assets/tray-icon.svg` exists
2. Verify the icon rendering in the UI
3. Try restarting the app with `npm start`

## Building for Production

```bash
npm run make
```

This creates:
- `.dmg` file for macOS (ideal for distribution)
- `.zip` file as a backup format

The built files are in `out/make/`.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `npm run format` and `npm run lint:fix`
5. Commit and push your changes
6. Open a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details

## Support

For issues, feature requests, or questions, please open an issue on GitHub: https://github.com/luisborges-de/LogoTray/issues
