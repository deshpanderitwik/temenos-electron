import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Conversations
  getConversations: () => ipcRenderer.invoke('get-conversations'),
  getConversation: (id: string) => ipcRenderer.invoke('get-conversation', id),
  saveConversation: (id: string, messages: any[]) => ipcRenderer.invoke('save-conversation', id, messages),
  deleteConversation: (id: string) => ipcRenderer.invoke('delete-conversation', id),
  
  // Narratives
  getNarratives: () => ipcRenderer.invoke('get-narratives'),
  getNarrative: (id: string) => ipcRenderer.invoke('get-narrative', id),
  saveNarrative: (id: string, narrative: any) => ipcRenderer.invoke('save-narrative', id, narrative),
  deleteNarrative: (id: string) => ipcRenderer.invoke('delete-narrative', id),
  
  // System Prompts
  getSystemPrompts: () => ipcRenderer.invoke('get-system-prompts'),
  getSystemPrompt: (id: string) => ipcRenderer.invoke('get-system-prompt', id),
  saveSystemPrompt: (id: string, prompt: any) => ipcRenderer.invoke('save-system-prompt', id, prompt),
  deleteSystemPrompt: (id: string) => ipcRenderer.invoke('delete-system-prompt', id),
  
  // Contexts
  getContexts: () => ipcRenderer.invoke('get-contexts'),
  getContext: (id: string) => ipcRenderer.invoke('get-context', id),
  saveContext: (id: string, context: any) => ipcRenderer.invoke('save-context', id, context),
  deleteContext: (id: string) => ipcRenderer.invoke('delete-context', id),
  
  // Images
  getImages: () => ipcRenderer.invoke('get-images'),
  getImage: (id: string) => ipcRenderer.invoke('get-image', id),
  saveImage: (id: string, image: any) => ipcRenderer.invoke('save-image', id, image),
  deleteImage: (id: string) => ipcRenderer.invoke('delete-image', id),
  uploadImage: (imageData: any) => ipcRenderer.invoke('upload-image', imageData),
  getImageContent: (id: string) => ipcRenderer.invoke('get-image-content', id),
  
  // Testing
  testEncryption: () => ipcRenderer.invoke('test-encryption'),
  
  // Healing API
  sendHealingMessage: (messages: any[], model: string, systemPrompt: string) => ipcRenderer.invoke('send-healing-message', messages, model, systemPrompt),
  
  // Configuration management
  getUserConfig: () => ipcRenderer.invoke('get-user-config'),
  saveUserConfig: (config: any) => ipcRenderer.invoke('save-user-config', config),
  
  // Platform info
  platform: process.platform,
  
  // App version
  appVersion: process.env['npm_package_version'] || '1.0.0'
});

// Type definitions for the exposed API
declare global {
  interface Window {
    electronAPI: {
      // Conversations
      getConversations: () => Promise<{ conversations: Array<{ id: string; title: string; created: string; lastModified: string; messageCount: number }> }>;
      getConversation: (id: string) => Promise<any>;
      saveConversation: (id: string, messages: any[]) => Promise<{ success: boolean; conversationId: string; title: string }>;
      deleteConversation: (id: string) => Promise<{ success: boolean }>;
      
      // Narratives
      getNarratives: () => Promise<{ narratives: Array<{ id: string; title: string; created: string; lastModified: string; characterCount: number; preferredMode?: string }> }>;
      getNarrative: (id: string) => Promise<any>;
      saveNarrative: (id: string, narrative: any) => Promise<{ success: boolean; narrativeId: string; title: string }>;
      deleteNarrative: (id: string) => Promise<{ success: boolean }>;
      
      // System Prompts
      getSystemPrompts: () => Promise<{ prompts: Array<{ id: string; title: string; created: string; lastModified: string }> }>;
      getSystemPrompt: (id: string) => Promise<any>;
      saveSystemPrompt: (id: string, prompt: any) => Promise<{ success: boolean; promptId: string; title: string }>;
      deleteSystemPrompt: (id: string) => Promise<{ success: boolean }>;
      
      // Contexts
      getContexts: () => Promise<{ contexts: Array<{ id: string; title: string; created: string; lastModified: string }> }>;
      getContext: (id: string) => Promise<any>;
      saveContext: (id: string, context: any) => Promise<{ success: boolean; contextId: string; title: string }>;
      deleteContext: (id: string) => Promise<{ success: boolean }>;
      
      // Images
      getImages: () => Promise<{ images: Array<{ id: string; title: string; created: string; lastModified: string; url: string }> }>;
      getImage: (id: string) => Promise<any>;
      saveImage: (id: string, image: any) => Promise<{ success: boolean; imageId: string; title: string }>;
      deleteImage: (id: string) => Promise<{ success: boolean }>;
      uploadImage: (imageData: any) => Promise<{ success: boolean; image: any }>;
      getImageContent: (id: string) => Promise<{ success: boolean; data: string; mimeType: string; size: number }>;
      
      // Testing
      testEncryption: () => Promise<{ success: boolean; message: string }>;
      
      // Healing API
      sendHealingMessage: (messages: any[], model: string, systemPrompt: string) => Promise<any>;
      
      // Configuration management
      getUserConfig: () => Promise<any>;
      saveUserConfig: (config: any) => Promise<{ success: boolean }>;
      
      platform: string;
      appVersion: string;
    };
  }
}
