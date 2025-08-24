import { useState } from 'react';
import ContextsList from './ContextsList';
import ContextForm from './ContextForm';
import Modal from './Modal';

interface ContextsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContextSelect: (context: { id: string; title: string; body: string; created: string; lastModified: string }) => void;
  onNewContext: () => void;
  onDeleteContext?: (contextId: string) => void;
  preloadedContexts?: Array<{ id: string; title: string; created: string; lastModified: string }>;
}

export default function ContextsModal({ isOpen, onClose, onContextSelect, onDeleteContext, preloadedContexts }: ContextsModalProps) {
  const [mode, setMode] = useState<'list' | 'form'>('list');
  const [refreshKey, setRefreshKey] = useState(0);
  const [editingContext, setEditingContext] = useState<null | { id: string; title: string; body: string; created: string; lastModified: string }>(null);
  const [viewOnly, setViewOnly] = useState(false);

  // Always reset to list mode when modal is closed
  if (!isOpen) {
    if (mode !== 'list') setMode('list');
    if (editingContext) setEditingContext(null);
    if (viewOnly) setViewOnly(false);
    return null;
  }

  const handleContextCreated = (context: { id: string; title: string; body: string; created: string; lastModified: string }) => {
    setMode('list');
    setEditingContext(null);
    setViewOnly(false);
    setRefreshKey(k => k + 1);
    
    // If this is a new context, we might want to select it immediately
    // or just close the modal and let the user see it in the list
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      {mode === 'list' && !editingContext ? (
        <ContextsList
          isOpen={true}
          onClose={onClose}
          currentContextId={null}
          onContextSelect={context => {
            onContextSelect(context);
            onClose();
          }}
          onNewContext={() => setMode('form')}
          onDeleteContext={(contextId) => {
            setRefreshKey(k => k + 1);
            onDeleteContext?.(contextId);
          }}
          onEditContext={(context, viewOnlyFlag) => { setEditingContext(context); setMode('form'); setViewOnly(!!viewOnlyFlag); }}
          isInsideModal={true}
          key={refreshKey}
          preloadedContexts={preloadedContexts}
          refreshKey={refreshKey}
        />
      ) : (
        <ContextForm
          isOpen={true}
          onClose={() => { setMode('list'); setEditingContext(null); setViewOnly(false); }}
          onCreated={handleContextCreated}
          initialContext={editingContext || undefined}
          viewOnly={viewOnly}
        />
      )}
    </Modal>
  );
} 