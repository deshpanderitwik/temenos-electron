import { useState, useEffect } from 'react';
import ItemListBrowser from './ItemListBrowser';
import ipcService from '../services/ipcService';

interface Context {
  id: string;
  title: string;
  body: string;
  created: string;
  lastModified: string;
}

interface ContextMetadata {
  id: string;
  title: string;
  created: string;
  lastModified: string;
}

interface ContextsListProps {
  isOpen: boolean;
  onClose: () => void;
  currentContextId: string | null;
  onContextSelect: (context: Context) => void;
  onNewContext: () => void;
  onDeleteContext: (contextId: string) => void;
  onEditContext: (context: Context, viewOnly?: boolean) => void;
  isInsideModal?: boolean;
  preloadedContexts?: ContextMetadata[];
  refreshKey?: number;
}

export default function ContextsList({ 
  isOpen, 
  onClose, 
  currentContextId, 
  onContextSelect, 
  onNewContext, 
  onDeleteContext, 
  onEditContext,
  isInsideModal = false,
  preloadedContexts = [],
  refreshKey = 0
}: ContextsListProps) {
  const [contexts, setContexts] = useState<ContextMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedContextId, setSelectedContextId] = useState<string | null>(null);

  // Load contexts from API
  const loadContexts = async () => {
    try {
      const data = await ipcService.getContexts();
      setContexts(data.contexts || []);
    } catch (error) {
      // Silent error handling for privacy
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadContexts();
    }
  }, [isOpen, refreshKey, preloadedContexts]);

  useEffect(() => {
    setSelectedContextId(currentContextId);
  }, [currentContextId]);

  const handleContextSelect = async (contextMetadata: ContextMetadata) => {
    try {
      // Fetch the full context with body when selected
      const fullContext = await ipcService.getContext(contextMetadata.id);
      if (fullContext) {
        setSelectedContextId(fullContext.id);
        onContextSelect(fullContext);
      }
    } catch (error) {
      // Fallback to metadata-only selection
      setSelectedContextId(contextMetadata.id);
      // Create a minimal context object for the callback
      const minimalContext: Context = {
        ...contextMetadata,
        body: ''
      };
      onContextSelect(minimalContext);
    }
  };

  const handleDeleteContext = async (contextId: string) => {
    try {
      const result = await ipcService.deleteContext(contextId);
      if (result.success) {
        setContexts(prev => prev.filter(c => c.id !== contextId));
        if (selectedContextId === contextId) {
          setSelectedContextId(null);
        }
        onDeleteContext(contextId);
      } else {
        // Failed to delete context
      }
    } catch (error) {
      // Silent error handling for privacy
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  // If not inside a modal, use the full ItemListBrowser component
  if (!isInsideModal) {
    return (
      <ItemListBrowser<ContextMetadata>
        isOpen={isOpen}
        onClose={onClose}
        items={contexts}
        currentItemId={currentContextId}
        onItemSelect={context => handleContextSelect(context)}
        onNewItem={onNewContext}
        onDeleteItem={id => handleDeleteContext(id)}
        renderItemTitle={c => c.title}
        renderItemDate={c => formatDate(c.lastModified)}
        getItemId={c => c.id}
        newItemLabel={'+ New Context'}
        closeOnNewItem={false}
        renderItemActions={c => onEditContext ? (
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="text-gray-400 p-2 transition-all rounded hover:text-white hover:bg-white/10"
              title="Edit"
              onClick={e => { 
                e.stopPropagation(); 
                (async () => {
                  try {
                    const fullContext = await ipcService.getContext(c.id);
                    if (fullContext) {
                      onEditContext(fullContext);
                    }
                  } catch (error) {
                    console.error('Error fetching full context for edit:', error);
                  }
                })();
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 0 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
              </svg>
            </button>
          </div>
        ) : null}
      />
    );
  }

  // If inside a modal, render just the content without the modal wrapper
  return (
    <>
      {/* New Item Button */}
      <div className="flex justify-center px-4 pt-6 pb-4">
        <button
          onClick={onNewContext}
          className="px-5 pt-2 pb-2.5 bg-white/10 text-white rounded-full hover:bg-white/20 transition-colors text-base font-surt-medium shadow-none"
        >
          + New Context
        </button>
      </div>

      {/* List */}
      <div className="flex-1 min-h-0 overflow-y-auto p-2 scrollbar-hide">
        {contexts.length > 0 ? (
          <div>
            {contexts.map((item, index) => {
              const id = item.id;
              return (
                <div key={id}>
                  <div
                    onClick={() => {
                      (async () => {
                        try {
                          const fullContext = await ipcService.getContext(item.id);
                          if (fullContext) {
                            onContextSelect(fullContext);
                          }
                        } catch (error) {
                          console.error('Error fetching full context:', error);
                          // Fallback to metadata-only selection
                          const minimalContext: Context = {
                            ...item,
                            body: ''
                          };
                          onContextSelect(minimalContext);
                        }
                        onClose();
                      })();
                    }}
                    className={`flex items-center justify-between px-4 py-4 cursor-pointer transition-all rounded-[12px] ${
                      currentContextId === id
                        ? 'bg-[rgba(255,255,255,0.1)]' : 'hover:bg-white/5'
                    }`}
                  >
                    <div className="truncate text-white text-base font-surt-medium">
                      {item.title}
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-gray-400 text-sm font-surt-medium">
                        {formatDate(item.lastModified)}
                      </span>
                      {onEditContext && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            className="text-gray-400 p-2 transition-all rounded hover:text-white hover:bg-white/10"
                            title="Edit"
                            onClick={e => { 
                              e.stopPropagation(); 
                              (async () => {
                                try {
                                  const fullContext = await ipcService.getContext(item.id);
                                  if (fullContext) {
                                    onEditContext(fullContext);
                                  }
                                } catch (error) {
                                  console.error('Error fetching full context for edit:', error);
                                }
                              })();
                            }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 0 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                            </svg>
                          </button>
                        </div>
                      )}
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          if (confirm('Are you sure you want to delete this context? This action cannot be undone.')) {
                            handleDeleteContext(id);
                          }
                        }}
                        className="text-gray-400 p-2 transition-all rounded hover:text-white hover:bg-white/10"
                        title="Delete"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-start justify-center h-full pt-8">
            <div className="text-center text-gray-400">
              <p className="text-sm leading-relaxed max-w-xs">
                No contexts yet.
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
} 