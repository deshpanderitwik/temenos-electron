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
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import HardBreak from '@tiptap/extension-hard-break';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import Typography from '@tiptap/extension-typography';
import { UndoRedo } from '@tiptap/extensions';
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
  const [isScrolling, setIsScrolling] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  
  // Essential refs only
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  // Guard to prevent onUpdate from firing during programmatic content sets
  const isProgrammaticContentChangeRef = useRef<boolean>(false);
  
  // Helper function to get editor content
  const getEditorContent = (editor: any): string => {
    if (!editor) return '';
    return editor.getHTML();
  };

  // Ensure empty paragraphs are preserved by representing them as <p>&nbsp;</p>
  const normalizeEmptyParagraphs = (html: string): string => {
    if (!html) return html;
    // Replace exactly empty paragraphs or <p><br></p> with a non-breaking space
    return html
      .replace(/<p>\s*<\/p>/g, '<p>&nbsp;</p>')
      .replace(/<p><br\s*\/>?<\/p>/g, '<p>&nbsp;</p>');
  };

  // Convert leading spaces/tabs at the start of paragraphs into &nbsp; to persist indentation
  const preserveLeadingIndentation = (html: string): string => {
    if (!html) return html;
    return html.replace(/<p>([ \t]+)/g, (_match, ws: string) => {
      let nbsp = '';
      for (let i = 0; i < ws.length; i++) {
        const ch = ws[i];
        if (ch === '\t') {
          nbsp += '&nbsp;&nbsp;&nbsp;&nbsp;';
        } else if (ch === ' ') {
          nbsp += '&nbsp;';
        }
      }
      return `<p>${nbsp}`;
    });
  };

  // Compute initial content for (re)creation
  const initialContent = currentNarrative
    ? (isDraftMode
        ? (currentNarrative.draftContent || '<p>&nbsp;</p>')
        : (currentNarrative.content || '<p>&nbsp;</p>'))
    : '<p>&nbsp;</p>';

  // Only create editor on client side. Recreate when narrative id changes to isolate history
  const editor = isClient ? useEditor({
    extensions: [
      Document,
      Paragraph,
      Text,
      HardBreak.configure({
        keepMarks: true,
      }),
      Typography,
      Placeholder.configure({
        placeholder: 'Begin writing your narrative here... Share your thoughts, insights, and the story that emerges from your exploration.',
      }),
      CharacterCount,
      UndoRedo.configure({
        depth: 100, // Store up to 100 undo steps
        newGroupDelay: 300, // Group operations within 300ms as one undo step
      }),
    ],
    content: initialContent,
    immediatelyRender: false,
    parseOptions: {
      preserveWhitespace: 'full',
    },
    onUpdate: ({ editor }) => {
      // ✅ Prevent content updates while loading to avoid race conditions
      if (isLoading || isProgrammaticContentChangeRef.current) return;
      
      // Get content from editor and normalize empty paragraphs
      const content = preserveLeadingIndentation(normalizeEmptyParagraphs(getEditorContent(editor)));
      
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
  }, [currentNarrative?.id]) : null;

  // Ensure editor is properly initialized
  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      // Focus the editor when it's ready
      editor.commands.focus();
    }
  }, [editor]);

  // Function to clear undo/redo history when switching narratives
  const clearUndoHistory = useCallback(() => {
    if (!editor) return;
    
    try {
      // Clear the undo/redo history by setting content
      // This effectively resets the history stack for narrative isolation
      const currentContent = editor.getHTML();
      
      // Clear content and set it again to reset the undo stack
      isProgrammaticContentChangeRef.current = true;
      editor.commands.clearContent();
      editor.commands.setContent(currentContent, { emitUpdate: false, parseOptions: { preserveWhitespace: 'full' } });
      isProgrammaticContentChangeRef.current = false;
      
      // Force focus to ensure the editor is ready
      editor.commands.focus();
    } catch (error) {
      console.error('Error clearing undo history:', error);
      // Fallback: just set the content directly
      if (editor) {
        const currentContent = editor.getHTML();
        isProgrammaticContentChangeRef.current = true;
        editor.commands.setContent(currentContent, { emitUpdate: false, parseOptions: { preserveWhitespace: 'full' } });
        isProgrammaticContentChangeRef.current = false;
      }
    }
  }, [editor]);

  // Enhanced scroll detection for Electron - finds the actual scrollable container
  const findScrollableContainer = useCallback((element: HTMLElement | null): HTMLElement | null => {
    if (!element) return null;
    
    // Check if current element is scrollable
    const style = getComputedStyle(element);
    const isScrollable = style.overflowY === 'auto' || 
                        style.overflowY === 'scroll' || 
                        style.overflow === 'auto' || 
                        style.overflow === 'scroll';
    
    if (isScrollable) {
      return element;
    }
    
    // Recursively check parent elements
    return findScrollableContainer(element.parentElement);
  }, []);

  // Enhanced scroll handler with smooth opacity transition
  const handleScroll = useCallback(() => {
    // Find the actual scrollable container
    const editorElement = editor?.view?.dom;
    if (!editorElement) return;
    
    const scrollableContainer = findScrollableContainer(editorElement);
    if (!scrollableContainer) return;
    
    const scrollTop = scrollableContainer.scrollTop;
    
    // Smooth opacity transition
    const fadeStart = 50;
    const fadeEnd = 200;
    
    let newOpacity;
    if (scrollTop <= fadeStart) {
      newOpacity = 0.95;
    } else if (scrollTop >= fadeEnd) {
      newOpacity = 0.3; // Much lower opacity when scrolling - 30%
    } else {
      // Smooth transition between fadeStart and fadeEnd
      const fadeProgress = (scrollTop - fadeStart) / (fadeEnd - fadeStart);
      newOpacity = 0.95 - (fadeProgress * 0.65); // 0.95 to 0.3
    }
    
    setTitleOpacity(newOpacity);
    setIsScrolling(scrollTop > 0);
  }, [editor, findScrollableContainer]);

  // Robust scroll event listener setup for Electron
  useEffect(() => {
    if (!editor) return;
    
    // Wait for editor to be fully rendered
    const setupScrollListener = () => {
      const editorElement = editor.view?.dom;
      if (!editorElement) return;
      
      const scrollableContainer = findScrollableContainer(editorElement);
      if (!scrollableContainer) return;
      
      // Add scroll listener with passive: true for better performance
      scrollableContainer.addEventListener('scroll', handleScroll, { passive: true });
      
      // Initial opacity calculation
      handleScroll();
      
      return () => {
        scrollableContainer.removeEventListener('scroll', handleScroll);
      };
    };
    
    // Small delay to ensure editor is fully rendered
    const timeoutId = setTimeout(setupScrollListener, 100);
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, [editor, handleScroll, findScrollableContainer]);

  // Consolidated narrative loading and mode handling
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    
    setIsLoading(true);
    
    try {
      if (currentNarrative) {
        // First, update the narrative state with all the data
        setNarrativeState({
          id: currentNarrative.id,
          title: currentNarrative.title || 'New Narrative',
          mainContent: currentNarrative.content || '',
          draftContent: currentNarrative.draftContent || '',
          lastSaved: null,
          hasUnsavedChanges: false
        });
        
        // Then, load the appropriate content based on current mode
        const contentToLoad = isDraftMode 
          ? preserveLeadingIndentation(normalizeEmptyParagraphs(currentNarrative.draftContent || '<p>&nbsp;</p>'))
          : preserveLeadingIndentation(normalizeEmptyParagraphs(currentNarrative.content || '<p>&nbsp;</p>'));
        
        // Only set content if it's different to prevent cursor jumping
        const currentContent = editor.getHTML();
        if (currentContent !== contentToLoad) {
          isProgrammaticContentChangeRef.current = true;
          editor.commands.setContent(contentToLoad, { emitUpdate: false, parseOptions: { preserveWhitespace: 'full' } });
          isProgrammaticContentChangeRef.current = false;
        }
        
        // Clear undo history when switching modes to prevent content bleeding
        clearUndoHistory();
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
        
        // Only set content if it's different to prevent cursor jumping
        const currentContent = editor.getHTML();
        if (currentContent !== '<p>&nbsp;</p>') {
          isProgrammaticContentChangeRef.current = true;
          editor.commands.setContent('<p>&nbsp;</p>', { emitUpdate: false, parseOptions: { preserveWhitespace: 'full' } });
          isProgrammaticContentChangeRef.current = false;
        }
        
        // Clear undo history when no narrative is selected
        clearUndoHistory();
      }
    } catch (error) {
      console.error('Error loading narrative:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentNarrative?.id, editor, clearUndoHistory]); // ✅ Only reload when narrative changes, not on mode toggle

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
      // Silent error handling for privacy
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
      // Silent error handling for privacy
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, narrativeState, isDraftMode, onNarrativeUpdate, onSave]);

  // Simple mode switch function
  const handleModeSwitch = useCallback(async () => {
    if (!editor || isLoading) return; // ✅ Prevent mode switching while loading
    
    // Save current content before switching
    await saveNarrative();
    
    // Toggle the mode
    const newMode = !isDraftMode;
    setIsDraftMode(newMode);
    
    // Load the appropriate content for the new mode
    const contentToLoad = newMode 
      ? preserveLeadingIndentation(normalizeEmptyParagraphs(narrativeState.draftContent || '<p>&nbsp;</p>'))
      : preserveLeadingIndentation(normalizeEmptyParagraphs(narrativeState.mainContent || '<p>&nbsp;</p>'));
    
    // Set content only if different to prevent cursor jumping
    const currentContent = editor.getHTML();
    if (currentContent !== contentToLoad) {
      isProgrammaticContentChangeRef.current = true;
      editor.commands.setContent(contentToLoad, { emitUpdate: false, parseOptions: { preserveWhitespace: 'full' } });
      isProgrammaticContentChangeRef.current = false;
    }
  }, [editor, isDraftMode, narrativeState, saveNarrative, setIsDraftMode, isLoading]);

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
      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute inset-0 bg-[#141414]/80 flex items-center justify-center z-50">
          <div className="text-white text-lg">Loading narrative...</div>
        </div>
      )}
      
      {/* Title and Editor Content grouped for unified nudge */}
      <div className="narrative-content-wrapper pt-12 pl-4 h-full flex flex-col">
        <div className="w-[664px] mx-auto h-full flex flex-col">
          {/* Title is independent of mode changes - remains the same in both main and draft modes */}
          <div className="relative flex-shrink-0">
            <input
              type="text"
              className="narrative-title text-2xl font-apoc-sans text-white outline-none border-none bg-transparent w-full transition-all duration-200 px-6"
              value={narrativeState.title}
              onChange={e => {
                // ✅ Prevent title updates while loading to avoid race conditions
                if (isLoading) return;
                
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
          <div 
            className="narrative-editor-content flex-1 overflow-y-auto px-6 relative"
            style={{
              minHeight: '0', // Critical: allows flex item to shrink below content size
              paddingTop: '8px', // Set to 8px padding
              paddingBottom: '0' // Remove bottom padding to eliminate gap
            }}
            ref={scrollContainerRef}
          >
            {/* Gradient fade over the text area */}
            <div 
              className="absolute left-0 right-0 pointer-events-none z-10"
              style={{
                height: '24px',
                background: 'linear-gradient(to bottom, rgba(20, 20, 20, 1) 0%, rgba(20, 20, 20, 0.9) 30%, rgba(20, 20, 20, 0.6) 60%, transparent 100%)'
              }}
            />
            
            <EditorContent 
              editor={editor} 
              className="narrative-editor bg-[#141414] w-full focus:outline-none"
              style={{
                fontFamily: 'var(--font-dm-sans)',
                fontSize: '16px',
                lineHeight: '1.6',
                color: 'white',
                padding: '16px 0px 560px', // Added 560px bottom padding for typing space
                margin: '0'
              }}
              onClick={() => editor?.commands.focus()}
              onKeyDown={(e) => {
                // Prevent tab from moving focus to next component
                if (e.key === 'Tab') {
                  e.preventDefault();
                  // Insert non-breaking spaces as indentation
                  if (editor) {
                    editor.chain().focus().insertContent('\u00A0\u00A0\u00A0\u00A0').run();
                  }
                }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
});

NarrativePanel.displayName = 'NarrativePanel';

export default NarrativePanel;