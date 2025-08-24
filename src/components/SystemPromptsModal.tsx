import { useState, useEffect } from 'react';
import SystemPromptsList from './SystemPromptsList';
import SystemPromptForm from './SystemPromptForm';
import Modal from './Modal';

interface SystemPromptsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activePrompt: { title: string; body: string };
  setActivePrompt: (prompt: { title: string; body: string }) => void;
  onNewPrompt: () => void;
  onDeletePrompt: (promptId: string) => void;
  onPromptCreated?: () => void;
  refreshTrigger?: number;
  preloadedPrompts?: Array<{ id: string; title: string; body?: string; created: string; lastModified: string }>;
}

export default function SystemPromptsModal({ isOpen, onClose, activePrompt, setActivePrompt, onNewPrompt, onDeletePrompt, onPromptCreated, refreshTrigger, preloadedPrompts }: SystemPromptsModalProps) {
  const [mode, setMode] = useState<'list' | 'form'>('list');
  const [refreshKey, setRefreshKey] = useState(0);
  const [editingPrompt, setEditingPrompt] = useState<null | { id: string; title: string; body?: string; created: string; lastModified: string }>(null);
  const [viewOnly, setViewOnly] = useState(false);
  // Removed newlyCreatedPrompt state - using simple refresh approach

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setMode('list');
      setEditingPrompt(null);
      setViewOnly(false);
      // When modal closes, notify parent to refresh
      onPromptCreated?.();
    }
  }, [isOpen, onPromptCreated]);

  const handleClose = () => {
    setMode('list');
    setEditingPrompt(null);
    setViewOnly(false);
    onClose();
  };

  const handleFormClose = () => {
    setMode('list');
    setEditingPrompt(null);
    setViewOnly(false);
  };

  const handleFormCreated = (newPrompt: { id: string; title: string; body?: string; created: string; lastModified: string }) => {
    setMode('list');
    setEditingPrompt(null);
    setViewOnly(false);
    // Simple approach: just refresh the data immediately
    setRefreshKey(k => k + 1);
  };

  const handleEditPrompt = (prompt: { id: string; title: string; body?: string; created: string; lastModified: string }, viewOnlyFlag?: boolean) => {
    setEditingPrompt(prompt);
    setMode('form');
    setViewOnly(!!viewOnlyFlag);
  };

  if (!isOpen) return null;

  // Determine what to render
  const shouldShowList = mode === 'list' && !editingPrompt;
  const shouldShowForm = mode === 'form' || editingPrompt;

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      {shouldShowList ? (
        <SystemPromptsList
          isOpen={true}
          onClose={handleClose}
          currentPromptId={null}
          onPromptSelect={prompt => {
            setActivePrompt({ title: prompt.title, body: prompt.body || '' });
            handleClose();
          }}
          onNewPrompt={() => {
            setMode('form');
          }}
          onDeletePrompt={onDeletePrompt}
          onEditPrompt={handleEditPrompt}
          isInsideModal={true}
          key={refreshKey}
          preloadedPrompts={preloadedPrompts}
          refreshKey={refreshKey || refreshTrigger}
          // Removed newlyCreatedPrompt prop - using simple refresh approach
        />
      ) : (
        <SystemPromptForm
          isOpen={true}
          onClose={handleFormClose}
          onCreated={handleFormCreated}
          initialPrompt={editingPrompt || undefined}
          viewOnly={viewOnly}
        />
      )}
    </Modal>
  );
} 