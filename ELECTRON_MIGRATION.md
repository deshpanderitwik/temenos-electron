# Temenos Electron Migration

This document outlines the migration from Next.js to Electron for the Temenos application.

## Project Structure

```
temenos-electron/
├── electron/                 # Electron-specific code
│   ├── main.ts              # Main process entry point
│   ├── preload.ts           # Preload script for IPC
│   └── tsconfig.json        # TypeScript config for Electron
├── src/                     # Next.js app (renderer process)
├── build/                   # Build resources and icons
├── dist/                    # Compiled Electron code
├── dist-electron/           # Packaged Electron app
└── electron-builder.json    # Electron builder configuration
```

## Development Workflow

### 1. Development Mode (Full Stack)
```bash
npm run dev:full
```
This command:
- Starts the Next.js development server
- Waits for it to be ready
- Launches the Electron app pointing to localhost:3000

### 2. Electron Development Only
```bash
npm run electron:dev
```
This compiles the Electron TypeScript and launches the app.

### 3. Build Electron
```bash
npm run electron:build
```
Compiles the Electron TypeScript code to JavaScript.

### 4. Package for Distribution
```bash
npm run electron:package
```
Builds and packages the app for distribution.

## Architecture Changes

### From Next.js API Routes to Electron IPC

**Before (Next.js):**
- API routes in `/api/` directory
- HTTP requests from frontend to backend
- Server-side file system operations

**After (Electron):**
- IPC handlers in main process (`electron/main.ts`)
- IPC calls from renderer to main process
- Direct file system access in main process

### Security Model

- **Context Isolation**: Renderer process cannot access Node.js APIs directly
- **Preload Script**: Safely exposes specific IPC methods to renderer
- **Main Process**: Handles all file system and system operations

## IPC Handlers

The following IPC handlers have been implemented to replace API routes:

- `get-conversations` - List encrypted conversation files
- `get-narratives` - List encrypted narrative files  
- `get-system-prompts` - List encrypted system prompt files
- `get-contexts` - List encrypted context files
- `get-images` - List encrypted image files

## Next Steps

### Phase 2: Core Architecture Migration ✅ COMPLETE
1. ✅ Basic IPC handlers implemented for listing data
2. ✅ IPC service layer created (replaces API calls)
3. ✅ Full CRUD operations implemented (basic JSON storage)
4. ⏳ Encryption/decryption in main process (saving as plain JSON for now)
5. ⏳ Migrate from localStorage to secure Electron storage

### Phase 3: UI Adaptation 🔄 IN PROGRESS
1. ✅ IPC service layer created
2. ✅ SessionLayout.tsx updated to use IPC (all fetch calls replaced)
3. ⏳ Update remaining components to use IPC instead of fetch
4. ⏳ Implement client-side routing
5. ✅ Design system consistency maintained

### Phase 4: Security & Optimization
1. Implement secure key management
2. Add auto-updates
3. Optimize for desktop performance

## Notes

- The app currently loads from `http://localhost:3000` in development
- In production, it will load from the built Next.js output
- All existing React components and styling remain intact
- The migration preserves the therapeutic companion interface design
