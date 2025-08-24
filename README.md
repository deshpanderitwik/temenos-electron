# Temenos

Temenos is a sacred container for Jungian healing work, powered by advanced language models. The application provides a space for deep psychological exploration and healing through the lens of analytical psychology.

## Features

- AI-powered Jungian therapeutic interactions
- Secure and private conversation handling
- Context-aware responses
- Modern, intuitive interface (coming soon)

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file in the root directory:
   ```bash
   cp env.example .env.local
   ```
   Then edit `.env.local` and add your actual API key:
   ```
   XAI_API_KEY=your_actual_xai_key
   ENCRYPTION_PASSWORD=your_secure_password
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

6. For production Electron build:
   ```bash
   npm run dist
   ```
   This creates a distributable package in `dist-electron/`.

## API Integration

The application now supports real AI API calls through Electron's IPC system:

### Supported AI Models

- **xAI (Grok)** - Uses grok-beta model

### Configuration Options

#### Option 1: Development Environment (Recommended for development)
1. Copy `env.example` to `.env.local`
2. Add your API keys:
   ```
   XAI_API_KEY=your_key_here
   ENCRYPTION_PASSWORD=your_password_here
   ```

#### Option 2: Production Build-time (For distribution)
Set environment variables when building:
```bash
XAI_API_KEY=your_key npm run dist
```

#### Option 3: Runtime User Configuration (For end users)
After installation, users can configure API keys using the provided utility:

```bash
node configure-api.js
```

Or manually create a config file at:
- **macOS:** `~/Library/Application Support/Temenos/config.json`
- **Windows:** `%APPDATA%\Temenos\config.json`
- **Linux:** `~/.config/Temenos/config.json`

Example config.json:
```json
{
  "XAI_API_KEY": "your_xai_key_here",
  "ENCRYPTION_PASSWORD": "your_secure_password"
}
```

### Features

- **Real AI Responses** - No more placeholder messages
- **Conversation Persistence** - All conversations are saved and retrievable
- **Secure Data Storage** - All data is encrypted and stored locally
- **AI Integration** - Powered by xAI's Grok model

## Technology Stack

- Next.js
- TypeScript
- Tailwind CSS
- xAI API (Grok 4)

## Security Note

Make sure to never commit your `.env.local` file or expose your API keys. The `.gitignore` file is configured to exclude sensitive files.
