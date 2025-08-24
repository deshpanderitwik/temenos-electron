import { useState, useEffect } from 'react';
import ipcService from '../services/ipcService';

interface ContextFormProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (context: { id: string; title: string; body: string; created: string; lastModified: string }) => void;
  initialContext?: { id: string; title: string; body: string; created: string; lastModified: string };
  viewOnly?: boolean;
}

export default function ContextForm({ isOpen, onClose, onCreated, initialContext, viewOnly }: ContextFormProps) {
  const [title, setTitle] = useState(initialContext?.title || '');
  const [body, setBody] = useState(initialContext?.body || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTitle(initialContext?.title || '');
    setBody(initialContext?.body || '');
  }, [initialContext]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      let result;
      
      if (initialContext) {
        // Update existing context
        result = await ipcService.saveContext(initialContext.id, { title, body });
      } else {
        // Create new context
        const newId = `context_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        result = await ipcService.saveContext(newId, { title, body });
      }
      
      if (result.success) {
        // Create the context object to pass back
        const contextData = {
          id: result.contextId || initialContext?.id || '',
          title: result.title || title,
          body: body,
          created: initialContext?.created || new Date().toISOString(),
          lastModified: new Date().toISOString()
        };
        
        onCreated(contextData);
        setTitle('');
        setBody('');
        onClose();
      } else {
        // Handle error case - the result might not have an error property
        setError('Failed to save context.');
      }
    } catch (err) {
      console.error('Error saving context:', err);
      setError('Failed to save context.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <form
      className="flex flex-col flex-1 p-8"
      style={{ minHeight: 0 }}
      onSubmit={handleSubmit}
      onClick={e => e.stopPropagation()}
    >

      <label className="text-gray-300 text-sm mb-2 font-surt-medium" htmlFor="context-title">Title</label>
      <input
        id="context-title"
        className={`mb-4 px-4 py-2 rounded bg-[#232323] border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500 font-surt-medium ${loading || viewOnly ? 'text-white/60 cursor-not-allowed' : 'text-white'}`}
        type="text"
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Give your context a title here"
        required
        disabled={loading || viewOnly}
        maxLength={100}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
      />
      <label className="text-gray-300 text-sm mb-2 font-surt-medium" htmlFor="context-body">Context</label>
      <textarea
        id="context-body"
        className={`mb-4 px-4 py-2 rounded bg-[#232323] border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[120px] flex-1 resize-none font-surt-medium ${loading || viewOnly ? 'text-white/60 cursor-not-allowed' : 'text-white'}`}
        value={body}
        onChange={e => setBody(e.target.value)}
        placeholder="Write the context text here"
        required
        disabled={loading || viewOnly}
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
          Save Context
        </button>
      </div>
    </form>
  );
} 