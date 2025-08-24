import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs/promises';
import { encrypt, decrypt } from './encryption';
import * as dotenv from 'dotenv';
import * as https from 'https';
import * as http from 'http';

// Global error handling
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  dialog.showErrorBox('Unexpected Error', 'An unexpected error occurred. Please restart the application.');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  dialog.showErrorBox('Unexpected Error', 'An unexpected error occurred. Please restart the application.');
});

// Load environment variables
dotenv.config();
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

let mainWindow: BrowserWindow | null = null;

const isDev = process.env['NODE_ENV'] === 'development' || !app.isPackaged;

// Proper resource path handling for data
const getDataPath = (dataDir: string) => {
  if (app.isPackaged) {
    // In production: ~/Library/Application Support/temenos-electron/data/{dataDir}
    const userDataPath = app.getPath('userData');
    return path.join(userDataPath, 'data', dataDir);
  } else {
    // In development: /Users/rit/Desktop/code/2025/temenos-electron/data/{dataDir}
    return path.join(process.cwd(), 'data', dataDir);
  }
};

// Initialize data directories
const initializeDataDirectories = async () => {
  console.log(`🔧 App is packaged: ${app.isPackaged}`);
  console.log(`🔧 User data path: ${app.getPath('userData')}`);
  console.log(`🔧 Current working directory: ${process.cwd()}`);
  
  const dataTypes = ['narratives', 'contexts', 'conversations', 'system-prompts', 'images'];
  
  for (const dataType of dataTypes) {
    const dataPath = getDataPath(dataType);
    try {
      await fs.mkdir(dataPath, { recursive: true });
      console.log(`📁 Created data directory: ${dataPath}`);
    } catch (error) {
      console.error(`❌ Failed to create data directory ${dataPath}:`, error);
    }
  }
  
  // If this is the first time running in production, try to migrate data from development location
  if (app.isPackaged) {
    await migrateDataFromDevelopment();
  }
};

// Migrate data from development location to production user data location
const migrateDataFromDevelopment = async () => {
  try {
    const devDataPath = path.join(process.cwd(), 'data');
    const userDataPath = app.getPath('userData');
    const prodDataPath = path.join(userDataPath, 'data');
    
    // Check if development data exists and production data is empty
    const devDataExists = await fs.access(devDataPath).then(() => true).catch(() => false);
    if (!devDataExists) {
      console.log('📁 No development data to migrate');
      return;
    }
    
    // Check if production data already exists
    const prodDataExists = await fs.access(prodDataPath).then(() => true).catch(() => false);
    if (prodDataExists) {
      console.log('📁 Production data already exists, skipping migration');
      return;
    }
    
    console.log('🔄 Migrating data from development to production...');
    
    // Copy all data directories
    const dataTypes = ['narratives', 'contexts', 'conversations', 'system-prompts', 'images'];
    for (const dataType of dataTypes) {
      const sourcePath = path.join(devDataPath, dataType);
      const targetPath = path.join(prodDataPath, dataType);
      
      try {
        if (await fs.access(sourcePath).then(() => true).catch(() => false)) {
          await fs.cp(sourcePath, targetPath, { recursive: true });
          console.log(`✅ Migrated ${dataType} data`);
        }
      } catch (error) {
        console.error(`❌ Failed to migrate ${dataType}:`, error);
      }
    }
    
    console.log('✅ Data migration completed');
  } catch (error) {
    console.error('❌ Data migration failed:', error);
  }
};

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js')
    },
    titleBarStyle: 'hiddenInset',
    show: false, // Don't show until ready
            icon: path.join(__dirname, '..', 'public', 'logo.png')
  });

  if (isDev) {
    // In development, load from Next.js dev server
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    // In production, start a simple HTTP server to serve static files
    const { createServer } = require('http');
    const { parse } = require('url');
    const { readFile, stat } = require('fs/promises');
    const path = require('path');
    
    const staticDir = app.isPackaged ? 
      path.join(process.resourcesPath, 'app.asar.unpacked', 'out') : 
      path.join(process.cwd(), 'out');
    
    console.log('🔧 Serving static files from:', staticDir);
    
    const server = createServer(async (req: any, res: any) => {
      try {
        const parsedUrl = parse(req.url, true);
        let filePath = path.join(staticDir, parsedUrl.pathname || 'index.html');
        
        // Default to index.html for root path
        if (parsedUrl.pathname === '/' || parsedUrl.pathname === '') {
          filePath = path.join(staticDir, 'index.html');
        }
        
        // Check if file exists
        try {
          const stats = await stat(filePath);
          if (stats.isDirectory()) {
            filePath = path.join(filePath, 'index.html');
          }
        } catch {
          // File doesn't exist, try index.html
          filePath = path.join(staticDir, 'index.html');
        }
        
        const content = await readFile(filePath);
        const ext = path.extname(filePath);
        
        // Set proper content type
        const mimeTypes: { [key: string]: string } = {
          '.html': 'text/html',
          '.css': 'text/css',
          '.js': 'application/javascript',
          '.json': 'application/json',
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.gif': 'image/gif',
          '.svg': 'image/svg+xml',
          '.ico': 'image/x-icon',
          '.woff': 'font/woff',
          '.woff2': 'font/woff2',
          '.otf': 'font/otf',
          '.ttf': 'font/ttf'
        };
        
        const contentType = mimeTypes[ext] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
      } catch (error) {
        console.error('Error serving file:', error);
        res.writeHead(404);
        res.end('File not found');
      }
    });
    
    server.listen(3001, () => {
      console.log('🔧 Static server running on http://localhost:3001');
      mainWindow?.loadURL('http://localhost:3001');
    });
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    if (parsedUrl.origin !== 'http://localhost:3000' && !isDev) {
      event.preventDefault();
    }
  });
}

// Setup all IPC handlers for data operations
function setupIPCHandlers(): void {
  // Generic CRUD handler factory
  const createCRUDHandlers = (dataType: string, dataDir: string) => {
    // Get all items
    ipcMain.handle(`get-${dataType}`, async () => {
      try {
        const dataPath = getDataPath(dataDir);
        console.log(`🔍 Getting ${dataType} from: ${dataPath} (isDev: ${isDev})`);
        
        const files = await fs.readdir(dataPath);
        const items = [];
        
        for (const file of files) {
          if (file.endsWith('.json')) {
            const filePath = path.join(dataPath, file);
            const content = await fs.readFile(filePath, 'utf-8');
            const item = JSON.parse(content);
            items.push(item);
          }
        }
        
        console.log(`✅ Found ${items.length} ${dataType}`);
        
        // Return in the format expected by the frontend
        if (dataType === 'system-prompts') {
          return { prompts: items.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()) };
        } else if (dataType === 'narratives') {
          return { narratives: items.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()) };
        } else if (dataType === 'contexts') {
          return { contexts: items.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()) };
        } else if (dataType === 'images') {
          return { images: items.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()) };
        } else {
          return { [dataType]: items.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()) };
        }
      } catch (error) {
        console.error(`Error getting ${dataType}:`, error);
        return { [dataType]: [] };
      }
    });

    // Get single item
    ipcMain.handle(`get-${dataType.slice(0, -1)}`, async (event, id: string) => {
      try {
        const dataPath = getDataPath(dataDir);
        const filePath = path.join(dataPath, `${id}.json`);
        const content = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(content);
      } catch (error) {
        console.error(`Error getting ${dataType.slice(0, -1)} ${id}:`, error);
        throw new Error(`${dataType.slice(0, -1)} not found`);
      }
    });

    // Save item
    ipcMain.handle(`save-${dataType.slice(0, -1)}`, async (event, id: string, data: any) => {
      try {
        const dataPath = getDataPath(dataDir);
        await fs.mkdir(dataPath, { recursive: true });
        
        const now = new Date().toISOString();
        const item = {
          id,
          ...data,
          lastModified: now,
          created: data.created || now
        };
        
        const filePath = path.join(dataPath, `${id}.json`);
        await fs.writeFile(filePath, JSON.stringify(item, null, 2));
        
        console.log(`✅ Saved ${dataType.slice(0, -1)} ${id} to ${filePath}`);
        
        return { 
          success: true, 
          [`${dataType.slice(0, -1)}Id`]: id, 
          title: data.title || id 
        };
      } catch (error) {
        console.error(`Error saving ${dataType.slice(0, -1)} ${id}:`, error);
        throw new Error(`Failed to save ${dataType.slice(0, -1)}`);
      }
    });

    // Delete item
    ipcMain.handle(`delete-${dataType.slice(0, -1)}`, async (event, id: string) => {
      try {
        const dataPath = getDataPath(dataDir);
        const filePath = path.join(dataPath, `${id}.json`);
        await fs.unlink(filePath);
        return { success: true };
      } catch (error) {
        console.error(`Error deleting ${dataType.slice(0, -1)} ${id}:`, error);
        throw new Error(`Failed to delete ${dataType.slice(0, -1)}`);
      }
    });
  };

  // Special handlers for specific data types
  const createSpecialHandlers = () => {
    // Conversations - special handling for messages
    ipcMain.handle('get-conversations', async () => {
      try {
        const dataPath = getDataPath('conversations');
        console.log('🔍 Getting conversations from:', dataPath);
        
        await fs.mkdir(dataPath, { recursive: true });
        
        const files = await fs.readdir(dataPath);
        const conversations = [];
        
        for (const file of files) {
          if (file.endsWith('.json')) {
            const filePath = path.join(dataPath, file);
            const content = await fs.readFile(filePath, 'utf-8');
            const conversation = JSON.parse(content);
            conversations.push(conversation);
          }
        }
        
        // Sort by last modified (newest first)
        const sortedConversations = conversations.sort((a, b) => 
          new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
        );
        
        console.log(`✅ Found ${sortedConversations.length} conversations`);
        return { conversations: sortedConversations };
      } catch (error) {
        console.error('Error getting conversations:', error);
        return { conversations: [] };
      }
    });

    ipcMain.handle('get-conversation', async (event, id: string) => {
      try {
        const dataPath = getDataPath('conversations');
        const filePath = path.join(dataPath, `${id}.json`);
        console.log('🔍 Getting conversation from:', filePath);
        
        const content = await fs.readFile(filePath, 'utf-8');
        const conversation = JSON.parse(content);
        
        console.log('✅ Retrieved conversation:', conversation.title);
        return conversation;
      } catch (error) {
        console.error('Error getting conversation:', error);
        throw new Error(`Conversation not found: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });

    ipcMain.handle('delete-conversation', async (event, id: string) => {
      try {
        const dataPath = getDataPath('conversations');
        const filePath = path.join(dataPath, `${id}.json`);
        console.log('🗑️ Deleting conversation from:', filePath);
        
        await fs.unlink(filePath);
        
        console.log('✅ Deleted conversation:', id);
        return { success: true };
      } catch (error) {
        console.error('Error deleting conversation:', error);
        throw new Error(`Failed to delete conversation: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });

    ipcMain.handle('save-conversation', async (event, id: string, messages: any[]) => {
      try {
        const dataPath = getDataPath('conversations');
        console.log('💾 Saving conversation to path:', dataPath);
        
        await fs.mkdir(dataPath, { recursive: true });
        
        const now = new Date().toISOString();
        const title = messages.length > 0 ? messages[0].content.slice(0, 50) + '...' : 'New Conversation';
        
        const conversation = {
          id,
          title,
          messages,
          created: now,
          lastModified: now,
          messageCount: messages.length
        };
        
        const filePath = path.join(dataPath, `${id}.json`);
        console.log('💾 Writing conversation to file:', filePath);
        
        await fs.writeFile(filePath, JSON.stringify(conversation, null, 2));
        
        console.log(`✅ Saved conversation ${id} to ${filePath}`);
        
        return { success: true, conversationId: id, title };
      } catch (error) {
        console.error('Error saving conversation:', error);
        throw new Error(`Failed to save conversation: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });

    // Images - special handling for file uploads
    ipcMain.handle('upload-image', async (event, imageData: any) => {
      try {
        const dataPath = getDataPath('images');
        await fs.mkdir(dataPath, { recursive: true });
        
        const id = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const now = new Date().toISOString();
        
        let imageUrl = '';
        if (imageData.imageFile) {
          // Save base64 image data
          const imagePath = path.join(dataPath, `${id}.json`);
          const imageItem = {
            id,
            title: imageData.title,
            created: now,
            lastModified: now,
            url: `data:${imageData.imageFile.type};base64,${imageData.imageFile.data}`,
            metadata: {
              name: imageData.imageFile.name,
              type: imageData.imageFile.type,
              size: imageData.imageFile.size
            }
          };
          await fs.writeFile(imagePath, JSON.stringify(imageItem, null, 2));
          imageUrl = imageItem.url;
        } else if (imageData.imageUrl) {
          imageUrl = imageData.imageUrl;
        }
        
        const image = {
          id,
          title: imageData.title,
          created: now,
          lastModified: now,
          url: imageUrl
        };
        
        console.log(`✅ Uploaded image ${id} to ${dataPath}`);
        
        return { success: true, image };
      } catch (error) {
        console.error('Error uploading image:', error);
        throw new Error('Failed to upload image');
      }
    });

    // Healing API - special handling for AI responses
    ipcMain.handle('send-healing-message', async (event, messages: any[], model: string, systemPrompt: string) => {
      try {
        console.log('🤖 Processing healing message:', { model, systemPrompt, messageCount: messages.length });
        
        // Get xAI API key from multiple sources (build-time env vars, runtime config, or user config)
        let xaiApiKey = process.env['XAI_API_KEY'];
        console.log('🔑 Environment XAI_API_KEY:', xaiApiKey ? 'Set' : 'Not set');
        
        // If not in environment, try to load from user config file
        if (!xaiApiKey) {
          try {
            const userConfigPath = path.join(app.getPath('userData'), 'config.json');
            console.log('🔍 Looking for user config at:', userConfigPath);
            
            if (await fs.access(userConfigPath).then(() => true).catch(() => false)) {
              const configContent = await fs.readFile(userConfigPath, 'utf-8');
              const userConfig = JSON.parse(configContent);
              console.log('📁 User config content:', Object.keys(userConfig));
              
              xaiApiKey = xaiApiKey || userConfig.XAI_API_KEY;
              console.log('🔧 Loaded xAI API key from user config:', xaiApiKey ? 'Success' : 'Failed');
            } else {
              console.log('❌ User config file not found');
            }
          } catch (error) {
            console.log('🔧 Error reading user config:', error instanceof Error ? error.message : 'Unknown error');
          }
        }
        
        if (!xaiApiKey) {
          throw new Error('No xAI API key configured. Please set XAI_API_KEY in your environment or user config.');
        }
        
        console.log('🔑 Final xAI API key status:', xaiApiKey ? 'Available' : 'Missing');
        
        let aiResponse = '';
        let usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
        
        // Prepare the conversation context
        const conversationContext = messages.map(msg => `${msg.role}: ${msg.content}`).join('\n');
        const fullPrompt = `${systemPrompt}\n\nConversation:\n${conversationContext}\n\nAssistant:`;
        
        if ((model === 'grok' || model === 'grok-4-0709') && xaiApiKey) {
          // Use xAI (Grok) API
          console.log('🔌 Using xAI (Grok) API...');
          const response = await fetch('https://api.x.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${xaiApiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: 'grok-4-0709',
              messages: [
                { role: 'system', content: systemPrompt },
                ...messages
              ],
              max_tokens: 1000,
              temperature: 0.7
            })
          });
          
          if (!response.ok) {
            throw new Error(`xAI API error: ${response.status} ${response.statusText}`);
          }
          
          const data = await response.json() as any;
          aiResponse = data.choices[0].message.content;
          usage = {
            prompt_tokens: data.usage.prompt_tokens,
            completion_tokens: data.usage.completion_tokens,
            total_tokens: data.usage.total_tokens
          };
          
        } else {
          throw new Error(`Model '${model}' not supported. Supported models: 'grok', 'grok-4-0709'`);
        }
        
        console.log('✅ AI response generated successfully');
        
        return {
          response: aiResponse,
          usage
        };
      } catch (error) {
        console.error('Error sending healing message:', error);
        throw new Error(`Failed to send healing message: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });

    // Get image content
    ipcMain.handle('get-image-content', async (event, id: string) => {
      try {
        const dataPath = getDataPath('images');
        const filePath = path.join(dataPath, `${id}.json`);
        console.log('🖼️ Getting image content from:', filePath);
        
        const content = await fs.readFile(filePath, 'utf-8');
        const image = JSON.parse(content);
        
        console.log('✅ Retrieved image content:', image.title);
        return image;
      } catch (error) {
        console.error('Error getting image content:', error);
        throw new Error(`Image not found: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });

    // Test encryption
    ipcMain.handle('test-encryption', async () => {
      try {
        const testData = { message: 'Hello, encryption test!' };
        const encrypted = await encrypt(JSON.stringify(testData), process.env['ENCRYPTION_PASSWORD'] || 'default-password-change-me');
        const decrypted = await decrypt(encrypted, process.env['ENCRYPTION_PASSWORD'] || 'default-password-change-me');
        return { success: true, encrypted, decrypted: JSON.parse(decrypted) };
      } catch (error) {
        console.error('Encryption test failed:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    // Configuration management
    ipcMain.handle('get-user-config', async () => {
      try {
        const userConfigPath = path.join(app.getPath('userData'), 'config.json');
        if (await fs.access(userConfigPath).then(() => true).catch(() => false)) {
          const configContent = await fs.readFile(userConfigPath, 'utf-8');
          return JSON.parse(configContent);
        }
        return {};
      } catch (error) {
        console.error('Error reading user config:', error);
        return {};
      }
    });

    ipcMain.handle('save-user-config', async (event, config: any) => {
      try {
        const userConfigPath = path.join(app.getPath('userData'), 'config.json');
        await fs.writeFile(userConfigPath, JSON.stringify(config, null, 2));
        console.log('✅ User config saved to:', userConfigPath);
        return { success: true };
      } catch (error) {
        console.error('Error saving user config:', error);
        throw new Error(`Failed to save config: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });
  };

  // Create handlers for all data types
  createCRUDHandlers('narratives', 'narratives');
  createCRUDHandlers('contexts', 'contexts');
  createCRUDHandlers('system-prompts', 'system-prompts');
  createCRUDHandlers('images', 'images');
  // Note: conversations handled by special handlers below
  
  // Debug: Log all registered handlers
  console.log('🔍 Registered IPC handlers:');
  console.log('  - get-system-prompts:', ipcMain.listenerCount('get-system-prompts'));
  console.log('  - get-system-prompt:', ipcMain.listenerCount('get-system-prompt'));
  console.log('  - save-system-prompt:', ipcMain.listenerCount('save-system-prompt'));
  console.log('  - delete-system-prompt:', ipcMain.listenerCount('delete-system-prompt'));
  
  // Create special handlers
  createSpecialHandlers();

  console.log('🔧 IPC handlers setup complete for all data types');
}

// This method will be called when Electron has finished initialization
app.whenReady().then(async () => {
  // Initialize data directories first
  await initializeDataDirectories();
  
  createWindow();
  setupIPCHandlers();
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Security: Prevent navigation to external URLs
app.on('web-contents-created', (event, contents) => {
  contents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    
    // Only allow navigation within our app
    if (parsedUrl.origin !== 'http://localhost:3000' && !isDev) {
      event.preventDefault();
    }
  });
});

console.log('Electron main process started');
