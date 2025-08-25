import { useState, useEffect, useRef } from 'react';
import ipcService from '../services/ipcService';

interface SystemPromptFormProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (prompt: { id: string; title: string; body: string; created: string; lastModified: string }) => void;
  initialPrompt?: { id: string; title: string; body?: string; created: string; lastModified: string };
  viewOnly?: boolean;
}

export default function SystemPromptForm({ isOpen, onClose, onCreated, initialPrompt, viewOnly }: SystemPromptFormProps) {
  const [title, setTitle] = useState(initialPrompt?.title || '');
  const [body, setBody] = useState(initialPrompt?.body || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setTitle(initialPrompt?.title || '');
    setBody(initialPrompt?.body || '');
  }, [initialPrompt]);

  // Focus the textarea when form opens and it's not view-only
  useEffect(() => {
    if (isOpen && !viewOnly && textareaRef.current) {
      // Small delay to ensure the modal is fully rendered
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, [isOpen, viewOnly]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      let result;
      
      if (initialPrompt) {
        // Update existing system prompt
        result = await ipcService.saveSystemPrompt(initialPrompt.id, { title, body });
      } else {
        // Create new system prompt
        const newId = `system-prompt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        result = await ipcService.saveSystemPrompt(newId, { title, body });
      }
      
      if (result.success) {
        // Create the system prompt object to pass back
        const promptData = {
          id: result.promptId || initialPrompt?.id || '',
          title: result.title || title,
          body: body,
          created: initialPrompt?.created || new Date().toISOString(),
          lastModified: new Date().toISOString()
        };
        
        onCreated(promptData);
        setTitle('');
        setBody('');
        onClose();
      } else {
        setError('Failed to save system prompt.');
      }
    } catch (err) {
      setError('Failed to save system prompt.');
    } finally {
      setLoading(false);
    }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    setTitle(e.target.value);
  };

  const handleBodyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    e.stopPropagation();
    setBody(e.target.value);
  };

  const handleFormClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  if (!isOpen) return null;

  return (
    <form
      className="flex flex-col flex-1 p-8"
      style={{ minHeight: 0 }}
      onSubmit={handleSubmit}
      onClick={handleFormClick}
    >
      <label className="text-gray-300 text-sm mb-2 font-surt-medium" htmlFor="system-prompt-title">Title</label>
      <input
        id="system-prompt-title"
        className={`mb-4 px-4 py-2 rounded bg-[#232323] border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500 font-surt-medium ${loading || viewOnly ? 'text-white/60 cursor-not-allowed' : 'text-white'}`}
        type="text"
        value={title}
        onChange={handleTitleChange}
        onKeyDown={(e) => e.stopPropagation()}
        placeholder="Give your prompt a title here"
        required
        disabled={loading || viewOnly}
        maxLength={100}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
      />
      <label className="text-gray-300 text-sm mb-2 font-surt-medium" htmlFor="system-prompt-body">Prompt</label>
      <textarea
        ref={textareaRef}
        id="system-prompt-body"
        className={`mb-4 px-4 py-2 rounded bg-[#232323] border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[120px] flex-1 resize-none font-surt-medium ${loading || viewOnly ? 'text-white/60 cursor-not-allowed' : 'text-white'}`}
        value={body}
        onChange={handleBodyChange}
        onKeyDown={(e) => e.stopPropagation()}
        onKeyUp={(e) => e.stopPropagation()}
        onKeyPress={(e) => e.stopPropagation()}
        placeholder="Write the body of your prompt here"
        required
        disabled={loading || viewOnly}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
      />
      {error && <div className="text-red-400 mb-4">{error}</div>}
      <div className="flex justify-end gap-3 mt-2">
        <button
          type="button"
          className={`px-5 py-2 rounded-full transition-colors text-base font-surt-medium shadow-none ${loading ? 'text-white/60 cursor-not-allowed' : 'bg-white/10 text-white hover:bg-white/20'}`}
          onClick={onClose}
          disabled={loading}
        >
          {viewOnly ? 'Close' : 'Cancel'}
        </button>
        <button
          type="submit"
          className={`px-5 py-2 rounded-full transition-colors text-base font-surt-medium shadow-none disabled:opacity-60 ${loading || viewOnly ? 'bg-white/20 text-white/60 cursor-not-allowed' : 'bg-white/20 text-white hover:bg-white/30'}`}
          disabled={loading || viewOnly}
        >
          Save Prompt
        </button>
      </div>
    </form>
  );
} 