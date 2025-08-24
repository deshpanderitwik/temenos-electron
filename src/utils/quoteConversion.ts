/**
 * Utility functions for converting regular quotes to typographic quotes
 */

/**
 * Converts regular quotes to typographic quotes in text
 * @param text - The text to convert
 * @returns The text with typographic quotes
 */
export function convertToTypographicQuotes(text: string): string {
  if (!text) return text;

  // Check if we're in a browser environment
  if (typeof document !== 'undefined') {
    // First, we need to handle the text as HTML content since TipTap uses HTML
    // We'll work with the text content and then reconstruct the HTML
    
    // Create a temporary div to parse HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = text;
    
    // Get the text content and convert quotes
    const textContent = tempDiv.textContent || tempDiv.innerText || '';
    const convertedText = convertQuotesInText(textContent);
    
    // If the original was just plain text, return the converted text
    if (text === textContent) {
      return convertedText;
    }
    
    // For HTML content, we need to be more careful
    // We'll replace quotes in text nodes while preserving HTML structure
    return convertQuotesInHTML(text);
  } else {
    // Node.js environment - just convert the text directly
    return convertQuotesInText(text);
  }
}

/**
 * Converts quotes in plain text with proper direction
 * @param text - Plain text to convert
 * @returns Text with typographic quotes
 */
export function convertQuotesInText(text: string): string {
  if (!text) return text;
  
  let result = text;
  
  // First, handle double quotes with proper direction
  result = convertDoubleQuotes(result);
  
  // Then handle single quotes and apostrophes with proper direction
  result = convertSingleQuotes(result);
  
  return result;
}

/**
 * Converts double quotes to typographic quotes with proper direction
 * @param text - Text to convert
 * @returns Text with typographic double quotes
 */
function convertDoubleQuotes(text: string): string {
  let result = text;
  let inQuotes = false;
  
  // Process the text character by character to determine quote direction
  for (let i = 0; i < result.length; i++) {
    if (result[i] === '"') {
      const nextChar = result[i + 1] || '';
      const prevChar = result[i - 1] || '';
      
      // Check if this is likely an opening quote
      const isOpeningQuote = 
        // At the beginning of text
        i === 0 ||
        // After whitespace, punctuation, or opening parenthesis
        /[\s.,!?;:([{'"\u201C\u2018]/.test(prevChar) ||
        // Before a letter or number
        /[a-zA-Z0-9]/.test(nextChar);
      
      // Check if this is likely a closing quote
      const isClosingQuote = 
        // At the end of text
        i === result.length - 1 ||
        // Before whitespace, punctuation, or closing parenthesis
        /[\s.,!?;:)\]}"'\u201D\u2019]/.test(nextChar) ||
        // After a letter or number
        /[a-zA-Z0-9]/.test(prevChar);
      
      if (inQuotes) {
        // We're already in quotes, so this is likely a closing quote
        result = result.slice(0, i) + '\u201D' + result.slice(i + 1);
        inQuotes = false;
      } else if (isOpeningQuote && !isClosingQuote) {
        // This is an opening quote
        result = result.slice(0, i) + '\u201C' + result.slice(i + 1);
        inQuotes = true;
      } else if (isClosingQuote && !isOpeningQuote) {
        // This is a closing quote
        result = result.slice(0, i) + '\u201D' + result.slice(i + 1);
      } else {
        // Ambiguous case - use context to decide
        if (isOpeningQuote) {
          result = result.slice(0, i) + '\u201C' + result.slice(i + 1);
          inQuotes = true;
        } else {
          result = result.slice(0, i) + '\u201D' + result.slice(i + 1);
        }
      }
    }
  }
  
  return result;
}

/**
 * Converts single quotes to typographic quotes with proper direction
 * @param text - Text to convert
 * @returns Text with typographic single quotes
 */
function convertSingleQuotes(text: string): string {
  let result = text;
  let inQuotes = false;
  
  // Process the text character by character to determine quote direction
  for (let i = 0; i < result.length; i++) {
    if (result[i] === "'") {
      const nextChar = result[i + 1] || '';
      const prevChar = result[i - 1] || '';
      const nextNextChar = result[i + 2] || '';
      
      // Check for common contractions and possessives
      // A contraction is when we have a letter before and after the apostrophe
      const isContraction = /[a-zA-Z]/.test(prevChar) && /[a-zA-Z]/.test(nextChar);
      
      // A possessive is when we have a letter before, 's' after, and then whitespace/punctuation
      const isPossessive = /[a-zA-Z]/.test(prevChar) && nextChar === 's' && /[\s.,!?;:)\]}"'\u201D\u2019]/.test(nextNextChar);
      
      // A plural possessive is when we have a letter before, 's' after, and then another apostrophe
      const isPluralPossessive = /[a-zA-Z]/.test(prevChar) && nextChar === 's' && nextNextChar === "'";
      
      if (isContraction || isPossessive) {
        // This is an apostrophe (right single quote)
        result = result.slice(0, i) + '\u2019' + result.slice(i + 1);
      } else if (isPluralPossessive) {
        // This is a plural possessive (right single quote)
        result = result.slice(0, i) + '\u2019' + result.slice(i + 1);
        // Also convert the next quote
        if (i + 1 < result.length && result[i + 1] === "'") {
          result = result.slice(0, i + 1) + '\u2019' + result.slice(i + 2);
        }
      } else {
        // This might be a quote - check the context more carefully
        const isOpeningQuote = 
          // At the beginning of text
          i === 0 ||
          // After whitespace, punctuation, or opening parenthesis
          /[\s.,!?;:([{'"\u201C\u2018]/.test(prevChar) ||
          // Before a letter or number
          /[a-zA-Z0-9]/.test(nextChar);
        
        const isClosingQuote = 
          // At the end of text
          i === result.length - 1 ||
          // Before whitespace, punctuation, or closing parenthesis
          /[\s.,!?;:)\]}"'\u201D\u2019]/.test(nextChar) ||
          // After a letter or number
          /[a-zA-Z0-9]/.test(prevChar);
        
        if (inQuotes) {
          // We're in quotes, so this is likely a closing quote
          result = result.slice(0, i) + '\u2019' + result.slice(i + 1);
          inQuotes = false;
        } else if (isOpeningQuote && !isClosingQuote) {
          // This is an opening quote
          result = result.slice(0, i) + '\u2018' + result.slice(i + 1);
          inQuotes = true;
        } else if (isClosingQuote && !isOpeningQuote) {
          // This is a closing quote
          result = result.slice(0, i) + '\u2019' + result.slice(i + 1);
        } else {
          // Ambiguous case - use context to decide
          if (isOpeningQuote) {
            result = result.slice(0, i) + '\u2018' + result.slice(i + 1);
            inQuotes = true;
          } else {
            result = result.slice(0, i) + '\u2019' + result.slice(i + 1);
          }
        }
      }
    }
  }
  
  return result;
}

/**
 * Converts quotes in HTML content while preserving HTML structure
 * @param html - HTML content to convert
 * @returns HTML with typographic quotes
 */
function convertQuotesInHTML(html: string): string {
  // Check if we're in a browser environment
  if (typeof document === 'undefined') {
    // Node.js environment - just convert the text directly
    return convertQuotesInText(html);
  }
  
  // Create a temporary div to work with the HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  
  // Walk through all text nodes and convert quotes
  walkTextNodes(tempDiv, (textNode) => {
    textNode.textContent = convertQuotesInText(textNode.textContent || '');
  });
  
  return tempDiv.innerHTML;
}

/**
 * Walks through all text nodes in an element and applies a function to each
 * @param element - The element to walk through
 * @param callback - Function to apply to each text node
 */
function walkTextNodes(element: Node, callback: (textNode: Text) => void): void {
  // Check if we're in a browser environment
  if (typeof document === 'undefined') {
    return;
  }
  
  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
    null
  );
  
  let textNode: Text | null;
  while (textNode = walker.nextNode() as Text) {
    callback(textNode);
  }
}

/**
 * Converts quotes in the current selection of a TipTap editor
 * @param editor - The TipTap editor instance
 */
export function convertQuotesInSelection(editor: any): void {
  if (!editor) return;
  
  const { state, dispatch } = editor;
  const { from, to } = state.selection;
  
  if (from === to) {
    // No selection, convert quotes in the entire document
    // Use a more careful approach to preserve tabs and document structure
    convertQuotesInDocument(editor);
  } else {
    // Convert quotes in the selected text
    const selectedText = state.doc.textBetween(from, to);
    const convertedText = convertQuotesInText(selectedText);
    
    // Replace the selected text with converted text
    editor.commands.insertContent(convertedText);
  }
}

/**
 * Converts quotes in the entire document while preserving tabs and structure
 * @param editor - The TipTap editor instance
 */
function convertQuotesInDocument(editor: any): void {
  if (!editor) return;
  
  const { state } = editor;
  const { doc, tr } = state;
  
  // Walk through all text nodes in the document and convert quotes
  let transaction = tr;
  
  doc.descendants((node: any, pos: number) => {
    if (node.isText) {
      const text = node.text || '';
      const convertedText = convertQuotesInText(text);
      
      if (text !== convertedText) {
        // Replace the text node with converted text
        transaction = transaction.replaceWith(
          pos,
          pos + text.length,
          state.schema.text(convertedText)
        );
      }
    }
  });
  
  // Apply the transaction if there were any changes
  if (transaction.docChanged) {
    editor.view.dispatch(transaction);
  }
} 