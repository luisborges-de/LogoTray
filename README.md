# LogoTray

A native macOS menubar application for quickly finding and using company logos.

## Features

- 🔍 **Quick Search** - Search for company logos by name or domain
- 🎨 **Multiple Sources** - Aggregates results from Logo.dev, Brandfetch, API Ninjas, Wikidata, and IconHorse
- 💾 **Smart Caching** - SQLite-based caching for instant results
- 🖱️ **Drag & Drop** - Drag logos directly into other applications
- ⌨️ **Keyboard Shortcuts** - Full keyboard navigation support (see [KEYBOARD_SHORTCUTS.md](KEYBOARD_SHORTCUTS.md))
- ♿ **Accessible** - WCAG compliant with screen reader support
- 🎭 **Glassmorphic UI** - Modern, beautiful interface that adapts to system theme
- ⚡ **Performance Optimized** - Virtualized grids for large result sets

## Keyboard Shortcuts

- **ESC** - Hide window
- **⌘Q** - Quit application
- **⌘K** - Focus search
- **⌘⌫** - Clear search

See [KEYBOARD_SHORTCUTS.md](KEYBOARD_SHORTCUTS.md) for complete documentation.

## Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Setup

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

3. In another terminal, start Electron:
```bash
npm run electron:dev
```

### Scripts

- `npm run dev` - Start both main and renderer development servers
- `npm run build` - Build for production
- `npm run electron` - Start Electron app
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run type-check` - Run TypeScript type checking

### Project Structure

```
src/
├── main/           # Electron main process
│   ├── main.ts     # Main process entry point with menubar integration
│   └── preload.ts  # Preload script for IPC communication
├── renderer/       # React renderer process
│   ├── App.tsx     # Main application component
│   ├── components/ # React components (LogoGrid, LogoCard, etc.)
│   └── hooks/      # Custom React hooks (useDebounce, etc.)
├── services/       # Business logic and API services
│   ├── api/        # API integration (Logo.dev, Brandfetch, etc.)
│   ├── cache/      # SQLite caching system
│   └── drag/       # Drag and drop handler
└── types/          # TypeScript type definitions
```

## Architecture

LogoTray follows a modular architecture with clear separation of concerns:

### Main Process
- **MenubarManager** - Manages tray icon and popover window
- **WindowManager** - Handles window creation and positioning
- **IPCHandler** - Manages communication between main and renderer processes

### Renderer Process
- **React Components** - Modern, accessible UI components
- **State Management** - Efficient state handling with hooks
- **Performance Optimization** - Virtualized grids for large datasets

### Service Layer
- **APIManager** - Coordinates searches across multiple logo sources
- **CacheManager** - SQLite-based caching for instant results
- **DragHandler** - Native drag and drop functionality

## Building

```bash
npm run build
npm run dist
```

## Testing

```bash
npm test              # Run all tests
npm run test:watch    # Run tests in watch mode
npm run test:ui       # Open Vitest UI
```

## Accessibility

LogoTray is built with accessibility in mind:
- Full keyboard navigation support
- Screen reader compatible with ARIA labels
- High contrast mode support
- Reduced motion support
- WCAG 2.1 AA compliant

See [KEYBOARD_SHORTCUTS.md](KEYBOARD_SHORTCUTS.md) for details.

## License

MIT