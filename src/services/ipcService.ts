// IPC Service Layer - Replaces Next.js API routes with Electron IPC calls

interface Conversation {
  id: string;
  title: string;
  created: string;
  lastModified: string;
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
}

interface Narrative {
  id: string;
  title: string;
  content: string;
  draftContent?: string;
  created: string;
  lastModified: string;
  characterCount: number;
  preferredMode?: 'draft' | 'main';
}

interface SystemPrompt {
  id: string;
  title: string;
  body: string;
  created: string;
  lastModified: string;
}

interface Context {
  id: string;
  title: string;
  body: string;
  created: string;
  lastModified: string;
}

interface Image {
  id: string;
  title: string;
  created: string;
  lastModified: string;
  url: string;
}

// Check if we're running in Electron
const isElectron = typeof window !== 'undefined' && 'electronAPI' in window;

// Fallback to API routes if not in Electron (for development)
const API_BASE = '/api';

class IPCService {
  // Conversations
  async getConversations(): Promise<{ conversations: Array<{ id: string; title: string; created: string; lastModified: string; messageCount: number }> }> {
    if (isElectron) {
      return (window as any).electronAPI.getConversations();
    } else {
      const response = await fetch(`${API_BASE}/conversations`);
      return response.json();
    }
  }

  async getConversation(id: string): Promise<Conversation> {
    if (isElectron) {
      return (window as any).electronAPI.getConversation(id);
    } else {
      const response = await fetch(`${API_BASE}/conversations/${id}`);
      return response.json();
    }
  }

  async saveConversation(id: string, messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>): Promise<{ success: boolean; conversationId: string; title: string }> {
    if (isElectron) {
      return (window as any).electronAPI.saveConversation(id, messages);
    } else {
      const response = await fetch(`${API_BASE}/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, messages })
      });
      return response.json();
    }
  }

  async deleteConversation(id: string): Promise<{ success: boolean }> {
    if (isElectron) {
      return (window as any).electronAPI.deleteConversation(id);
    } else {
      const response = await fetch(`${API_BASE}/conversations/${id}`, {
        method: 'DELETE'
      });
      return response.json();
    }
  }

  // Narratives
  async getNarratives(): Promise<{ narratives: Array<{ id: string; title: string; created: string; lastModified: string; characterCount: number }> }> {
    if (isElectron) {
      return (window as any).electronAPI.getNarratives();
    } else {
      const response = await fetch(`${API_BASE}/narratives`);
      return response.json();
    }
  }

  async getNarrative(id: string): Promise<Narrative> {
    if (isElectron) {
      return (window as any).electronAPI.getNarrative(id);
    } else {
      const response = await fetch(`${API_BASE}/narratives/${id}`);
      return response.json();
    }
  }

  async saveNarrative(id: string, narrative: Partial<Narrative>): Promise<{ success: boolean; narrativeId: string; title: string }> {
    console.log('🚀 ipcService.saveNarrative called with:', { id, narrative, isElectron });
    
    if (isElectron) {
      console.log('🔌 Calling Electron API...');
      const result = await (window as any).electronAPI.saveNarrative(id, narrative);
      console.log('🔌 Electron API result:', result);
      return result;
    } else {
      console.log('🌐 Using fetch API...');
      const response = await fetch(`${API_BASE}/narratives`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...narrative })
      });
      return response.json();
    }
  }

  async deleteNarrative(id: string): Promise<{ success: boolean }> {
    if (isElectron) {
      return (window as any).electronAPI.deleteNarrative(id);
    } else {
      const response = await fetch(`${API_BASE}/narratives/${id}`, {
        method: 'DELETE'
      });
      return response.json();
    }
  }

  // System Prompts
  async getSystemPrompts(): Promise<{ prompts: Array<{ id: string; title: string; body?: string; created: string; lastModified: string }> }> {
    if (isElectron) {
      return (window as any).electronAPI.getSystemPrompts();
    } else {
      const response = await fetch(`${API_BASE}/system-prompts`);
      return response.json();
    }
  }

  async getSystemPrompt(id: string): Promise<SystemPrompt> {
    if (isElectron) {
      return (window as any).electronAPI.getSystemPrompt(id);
    } else {
      const response = await fetch(`${API_BASE}/system-prompts/${id}`);
      return response.json();
    }
  }

  async saveSystemPrompt(id: string, prompt: Partial<SystemPrompt>): Promise<{ success: boolean; promptId: string; title: string }> {
    if (isElectron) {
      return (window as any).electronAPI.saveSystemPrompt(id, prompt);
    } else {
      const response = await fetch(`${API_BASE}/system-prompts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...prompt })
      });
      return response.json();
    }
  }

  async deleteSystemPrompt(id: string): Promise<{ success: boolean }> {
    if (isElectron) {
      return (window as any).electronAPI.deleteSystemPrompt(id);
    } else {
      const response = await fetch(`${API_BASE}/system-prompts/${id}`, {
        method: 'DELETE'
      });
      return response.json();
    }
  }

  // Contexts
  async getContexts(): Promise<{ contexts: Array<{ id: string; title: string; created: string; lastModified: string }> }> {
    if (isElectron) {
      return (window as any).electronAPI.getContexts();
    } else {
      const response = await fetch(`${API_BASE}/contexts`);
      return response.json();
    }
  }

  async getContext(id: string): Promise<Context> {
    if (isElectron) {
      return (window as any).electronAPI.getContext(id);
    } else {
      const response = await fetch(`${API_BASE}/contexts/${id}`);
      return response.json();
    }
  }

  async saveContext(id: string, context: Partial<Context>): Promise<{ success: boolean; contextId: string; title: string }> {
    if (isElectron) {
      return (window as any).electronAPI.saveContext(id, context);
    } else {
      const response = await fetch(`${API_BASE}/contexts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...context })
      });
      return response.json();
    }
  }

  async deleteContext(id: string): Promise<{ success: boolean }> {
    if (isElectron) {
      return (window as any).electronAPI.deleteContext(id);
    } else {
      const response = await fetch(`${API_BASE}/contexts/${id}`, {
        method: 'DELETE'
      });
      return response.json();
    }
  }

  // Images
  async getImages(): Promise<{ images: Array<{ id: string; title: string; created: string; lastModified: string; url: string }> }> {
    if (isElectron) {
      return (window as any).electronAPI.getImages();
    } else {
      const response = await fetch(`${API_BASE}/images`);
      return response.json();
    }
  }

  async getImage(id: string): Promise<Image> {
    if (isElectron) {
      return (window as any).electronAPI.getImage(id);
    } else {
      const response = await fetch(`${API_BASE}/images/${id}`);
      return response.json();
    }
  }

  async saveImage(id: string, image: Partial<Image>): Promise<{ success: boolean; imageId: string; title: string }> {
    if (isElectron) {
      return (window as any).electronAPI.saveImage(id, image);
    } else {
      const response = await fetch(`${API_BASE}/images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...image })
      });
      return response.json();
    }
  }

  async deleteImage(id: string): Promise<{ success: boolean }> {
    if (isElectron) {
      return (window as any).electronAPI.deleteImage(id);
    } else {
      const response = await fetch(`${API_BASE}/images/${id}`, {
        method: 'DELETE'
      });
      return response.json();
    }
  }

  // Image upload (new method)
  async uploadImage(imageData: { title: string; imageFile?: File; imageUrl?: string }): Promise<{ success: boolean; image: any }> {
    if (isElectron) {
      // Convert File to base64 for IPC
      let processedData: any = { title: imageData.title };
      
      if (imageData.imageFile) {
        const arrayBuffer = await imageData.imageFile.arrayBuffer();
        // Convert ArrayBuffer to base64 without using Node.js Buffer
        const bytes = new Uint8Array(arrayBuffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binary);
        
        processedData.imageFile = {
          name: imageData.imageFile.name,
          type: imageData.imageFile.type,
          size: imageData.imageFile.size,
          data: base64
        };
      } else if (imageData.imageUrl) {
        processedData.imageUrl = imageData.imageUrl;
      }
      
      return (window as any).electronAPI.uploadImage(processedData);
    } else {
      // Use FormData for web API
      const formData = new FormData();
      formData.append('title', imageData.title);
      
      if (imageData.imageFile) {
        formData.append('image', imageData.imageFile);
      } else if (imageData.imageUrl) {
        formData.append('imageUrl', imageData.imageUrl);
      }
      
      const response = await fetch(`${API_BASE}/images`, {
        method: 'POST',
        body: formData
      });
      return response.json();
    }
  }

  // Get image content (new method)
  async getImageContent(id: string): Promise<{ success: boolean; data: string; mimeType: string; size: number }> {
    if (isElectron) {
      return (window as any).electronAPI.getImageContent(id);
    } else {
      const response = await fetch(`${API_BASE}/images/${id}/content`);
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      // Convert ArrayBuffer to base64 without using Node.js Buffer
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);
      
      return {
        success: true,
        data: base64,
        mimeType: blob.type,
        size: blob.size
      };
    }
  }

  // Healing API (special case)
  async sendHealingMessage(messages: Array<{ role: string; content: string }>, model: string, systemPrompt: string): Promise<any> {
    console.log('🔌 ipcService.sendHealingMessage called:', { isElectron, messageCount: messages.length, model, systemPromptLength: systemPrompt.length });
    
    if (isElectron) {
      console.log('🔌 Calling Electron API...');
      const result = await (window as any).electronAPI.sendHealingMessage(messages, model, systemPrompt);
      console.log('🔌 Electron API result:', result);
      return result;
    } else {
      console.log('🌐 Using fetch API...');
      const response = await fetch(`${API_BASE}/healing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, model, systemPrompt })
      });
      return response.json();
    }
  }
}

export const ipcService = new IPCService();
export default ipcService;
