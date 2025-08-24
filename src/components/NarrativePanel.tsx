'use client';

/**
 * Narrative Editor Component - Reimplemented with Simple Draft/Main Logic
 * 
 * Keyboard Shortcuts:
 * - Cmd+Z (Mac) / Ctrl+Z (Windows/Linux): Undo
 * - Cmd+Shift+Z (Mac) / Ctrl+Y (Windows/Linux): Redo
 * - Cmd+S (Mac) / Ctrl+S (Windows/Linux): Save
 * - Cmd+Enter (Mac) / Ctrl+Enter (Windows/Linux): Add new paragraph
 * - Cmd+' (Mac) / Ctrl+' (Windows/Linux): Convert quotes to typographic quotes
 * - Cmd+[ (Mac) / Ctrl+[ (Windows/Linux): Move to previous sentence
 * - Cmd+] (Mac) / Ctrl+] (Windows/Linux): Move to next sentence
 * - Cmd+J (Mac) / Ctrl+J (Windows/Linux): Toggle draft/main mode (global)
 * - Cmd+B: Bold text
 * - Cmd+I: Italic text
 * - Cmd+1/2/3: Heading levels 1/2/3
 * - Tab: Insert tab character
 * - Shift+Tab: Remove indentation (outdent)
 */

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import Typography from '@tiptap/extension-typography';
import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { convertQuotesInSelection } from '../utils/quoteConversion';
import { moveToNextSentence, moveToPreviousSentence } from '../utils/sentenceNavigation';
import ipcService from '../services/ipcService';

// Client-side only check
const isClient = typeof window !== 'undefined';

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

interface NarrativePanelProps {
  currentNarrative: Narrative | null;
  onNarrativeUpdate: (narrative: Narrative | null) => void;
  onSave?: () => void;
  isDraftMode: boolean;
  setIsDraftMode: (v: boolean) => void;
}

export interface NarrativePanelRef {
  addTextToContent: (text: string) => void;
  saveCurrentContent: () => Promise<void>;
  handleModeSwitch: () => Promise<void>;
}

// Simplified narrative state - single source of truth
interface NarrativeState {
  id: string | null;
  title: string;
  mainContent: string;
  draftContent: string;
  lastSaved: Date | null;
  hasUnsavedChanges: boolean;
}

const NarrativePanel = forwardRef<NarrativePanelRef, NarrativePanelProps>(({ currentNarrative, onNarrativeUpdate, onSave, isDraftMode, setIsDraftMode }, ref) => {
  // Simplified state - single source of truth
  const [narrativeState, setNarrativeState] = useState<NarrativeState>({
    id: null,
    title: '',
    mainContent: '',
    draftContent: '',
    lastSaved: null,
    hasUnsavedChanges: false
  });

  // Simple state variables
  const [isSaving, setIsSaving] = useState(false);
  const [titleOpacity, setTitleOpacity] = useState(0.95);

  
  // Essential refs only
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Helper function to get editor content
  const getEditorContent = (editor: any): string => {
    if (!editor) return '';
    return editor.getHTML();
  };

  // Only create editor on client side
  const editor = isClient ? useEditor({
    extensions: [
      StarterKit.configure({
        history: false, // Disable history from StarterKit since we'll add it separately
      }),
      Typography,
      Placeholder.configure({
        placeholder: 'Begin writing your narrative here... Share your thoughts, insights, and the story that emerges from your exploration.',
      }),
      CharacterCount,
      // History.configure({
      //   depth: 100,
      // }),
    ],
    content: '<p></p>',
    immediatelyRender: false,
    parseOptions: {
      preserveWhitespace: true,
    },
    onUpdate: ({ editor }) => {
      // Get content from editor
      const content = getEditorContent(editor);
      
      // Update the appropriate content based on current mode - SIMPLE LOGIC
      if (isDraftMode) {
        setNarrativeState(prev => ({
          ...prev,
          draftContent: content,
          hasUnsavedChanges: true
        }));
      } else {
        setNarrativeState(prev => ({
          ...prev,
          mainContent: content,
          hasUnsavedChanges: true
        }));
      }
      
      // Auto-save after typing stops
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      saveTimeoutRef.current = setTimeout(() => {
        handleAutoSave();
      }, 1000);
    },
    editorProps: {
      attributes: {
        class: 'max-w-none focus:outline-none',
        style: 'height: 100%; overflow: visible; white-space: pre-wrap;',
      },

    },
  }) : null;

  // Ensure editor is properly initialized
  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      // Focus the editor when it's ready
      editor.commands.focus();
    }
  }, [editor]);

  // Load narrative data when currentNarrative changes
  useEffect(() => {
    if (currentNarrative) {
      setNarrativeState({
        id: currentNarrative.id,
        title: currentNarrative.title || 'New Narrative',
        mainContent: currentNarrative.content || '',
        draftContent: currentNarrative.draftContent || '',
        lastSaved: null,
        hasUnsavedChanges: false
      });
      
      // Load the appropriate content based on current mode (no cross-contamination)
      const contentToLoad = isDraftMode 
        ? (currentNarrative.draftContent || '<p></p>')
        : (currentNarrative.content || '<p></p>');
      
      if (editor) {
        editor.commands.setContent(contentToLoad, false, { preserveWhitespace: true });
      }
    } else {
      // Reset to default state when no narrative is selected
      setNarrativeState({
        id: null,
        title: 'New Narrative',
        mainContent: '',
        draftContent: '',
        lastSaved: null,
        hasUnsavedChanges: false
      });
      
      if (editor) {
        editor.commands.setContent('<p></p>', false, { preserveWhitespace: true });
      }
    }
  }, [currentNarrative, editor]);

  // Handle mode changes - load appropriate content (no cross-contamination)
  useEffect(() => {
    if (editor && currentNarrative) {
      const contentToLoad = isDraftMode 
        ? (narrativeState.draftContent || '<p></p>')
        : (narrativeState.mainContent || '<p></p>');
      
      editor.commands.setContent(contentToLoad, false, { preserveWhitespace: true });
    }
  }, [isDraftMode, editor, currentNarrative, narrativeState]);

  // Simple auto-save function
  const handleAutoSave = useCallback(async () => {
    if (isSaving || !narrativeState.id) return;
    
    setIsSaving(true);
    
    try {
      const narrativeId = narrativeState.id;
      const data = await ipcService.saveNarrative(narrativeId, {
        title: narrativeState.title,
        content: narrativeState.mainContent,
        draftContent: narrativeState.draftContent,
        preferredMode: isDraftMode ? 'draft' : 'main',
      });
      
      if (data.success) {
        setNarrativeState(prev => ({
          ...prev,
          lastSaved: new Date(),
          hasUnsavedChanges: false
        }));
      }
    } catch (error) {
      console.error('Error auto-saving narrative:', error);
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, narrativeState, isDraftMode]);

  // Simple save function
  const saveNarrative = useCallback(async () => {
    if (isSaving) return;
    
    setIsSaving(true);
    
    try {
      const narrativeId = narrativeState.id || `narrative_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const data = await ipcService.saveNarrative(narrativeId, {
        title: narrativeState.title,
        content: narrativeState.mainContent,
        draftContent: narrativeState.draftContent,
        preferredMode: isDraftMode ? 'draft' : 'main',
      });
      
      if (data.success) {
        setNarrativeState(prev => ({
          ...prev,
          id: narrativeId,
          lastSaved: new Date(),
          hasUnsavedChanges: false
        }));
        
        // Update parent state
        onNarrativeUpdate({
          id: narrativeId,
          title: narrativeState.title,
          content: narrativeState.mainContent,
          draftContent: narrativeState.draftContent,
          created: new Date().toISOString(),
          lastModified: new Date().toISOString(),
          characterCount: narrativeState.mainContent.length,
          preferredMode: isDraftMode ? 'draft' : 'main'
        });
        
        onSave?.();
      }
    } catch (error) {
      console.error('Error saving narrative:', error);
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, narrativeState, isDraftMode, onNarrativeUpdate, onSave]);

  // Simple mode switch function
  const handleModeSwitch = useCallback(async () => {
    if (!editor) return;
    
    // Save current content before switching
    await saveNarrative();
    
    // Toggle the mode
    const newMode = !isDraftMode;
    setIsDraftMode(newMode);
    
    // Load the appropriate content for the new mode
    const contentToLoad = newMode 
      ? narrativeState.draftContent || '<p></p>'
      : narrativeState.mainContent || '<p></p>';
    
    // Set content
    editor.commands.setContent(contentToLoad, false, { preserveWhitespace: true });
  }, [editor, isDraftMode, narrativeState, saveNarrative, setIsDraftMode]);

  // Simple save current content function
  const saveCurrentContent = async () => {
    await saveNarrative();
  };

  // Function to add text to the current content
  const addTextToContent = useCallback((text: string) => {
    if (!editor) return;
    
    // Check if the text contains multiple paragraphs (has double newlines)
    const hasMultipleParagraphs = text.includes('\n\n') || text.split('\n').filter(line => line.trim().length > 0).length > 1;
    
    if (hasMultipleParagraphs) {
      // Split by double newlines to preserve paragraph structure
      const paragraphs = text.split('\n\n').filter(paragraph => paragraph.trim().length > 0);
      
      paragraphs.forEach((paragraph, paragraphIndex) => {
        if (paragraphIndex > 0) {
          // Add paragraph break between paragraphs
          editor.commands.enter();
        }
        
        // Convert paragraph to HTML to preserve line breaks within paragraphs
        const lines = paragraph.split('\n').filter(line => line.length > 0);
        
        // Handle bullet points more carefully
        const processedLines = lines.map(line => {
          // If line starts with a bullet point, ensure it has proper spacing
          if (line.trim().startsWith('•')) {
            return line.replace(/^(\s*•\s*)/, '• ');
          }
          return line;
        });
        
        const htmlContent = `<p>${processedLines.join('<br>')}</p>`;
        
        // Insert as HTML to preserve formatting
        editor.commands.insertContent(htmlContent);
      });
    } else {
      // If single paragraph, convert to HTML to preserve line breaks
      const lines = text.split('\n').filter(line => line.length > 0);
      
      // Handle bullet points more carefully
      const processedLines = lines.map(line => {
        // If line starts with a bullet point, ensure it has proper spacing
        if (line.trim().startsWith('•')) {
          return line.replace(/^(\s*•\s*)/, '• ');
        }
        return line;
      });
      
      const htmlContent = `<p>${processedLines.join('<br>')}</p>`;
      editor.commands.insertContent(htmlContent);
    }
  }, [editor]);

  // Expose functions to parent component via ref
  useImperativeHandle(ref, () => ({
    addTextToContent,
    saveCurrentContent,
    handleModeSwitch
  }), [addTextToContent, saveCurrentContent, handleModeSwitch]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  if (!editor) return null;

  // Ensure editor is ready
  if (editor.isDestroyed) {
    return null;
  }

  // Don't render on server side
  if (!isClient) {
    return null;
  }

  return (
    <div className="h-full flex flex-col bg-[#141414]">
      {/* Title and Editor Content grouped for unified nudge */}
      <div className="narrative-content-wrapper pt-12 pl-4 h-full flex flex-col">
        <div className="w-[664px] mx-auto">
          {/* Title is independent of mode changes - remains the same in both main and draft modes */}
          <div className="relative">
            <input
              type="text"
              className="narrative-title text-2xl font-apoc-sans text-white outline-none border-none bg-transparent w-full transition-all duration-200 px-6"
              value={narrativeState.title}
              onChange={e => {
                const newTitle = e.target.value;
                setNarrativeState(prev => ({
                  ...prev,
                  title: newTitle,
                  hasUnsavedChanges: true
                }));
                
                // Auto-save title changes
                if (saveTimeoutRef.current) {
                  clearTimeout(saveTimeoutRef.current);
                }
                
                saveTimeoutRef.current = setTimeout(() => {
                  handleAutoSave();
                }, 1000);
              }}
              onBlur={async e => {
                // Save on blur
                if (narrativeState.hasUnsavedChanges) {
                  await saveNarrative();
                }

              }}

              style={{
                opacity: titleOpacity,

                fontFamily: 'var(--font-apoc-revelations-ultrabold), serif',
                minHeight: '1.5rem',
                transition: 'opacity 0.3s ease-out',
                cursor: titleOpacity < 0.95 ? 'pointer' : 'text'
              }}
              placeholder="Enter your narrative title..."
            />
          </div>

          {/* Editor Content */}
          <div className="narrative-editor-content flex-1 min-h-0 overflow-y-auto px-6 pt-4">
            <EditorContent 
              editor={editor} 
              className="narrative-editor bg-[#141414] h-full focus:outline-none"
              style={{
                fontFamily: 'var(--font-dm-sans)',
                fontSize: '16px',
                lineHeight: '1.6',
                color: 'white',
                padding: '0',
                margin: '0'
              }}
              onClick={() => editor?.commands.focus()}
            />
          </div>
        </div>
      </div>
    </div>
  );
});

NarrativePanel.displayName = 'NarrativePanel';

export default NarrativePanel;