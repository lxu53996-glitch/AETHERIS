import mammoth from 'mammoth';

/**
 * Result of parsing an imported file
 */
export interface ParsedFile {
  title: string;
  content: string;
}

/**
 * Parse uploaded file and extract title and content
 * Supports .txt, .md, and .docx formats
 * 
 * @param file - File object from file input or dropzone
 * @returns Promise resolving to { title, content }
 */
export async function parseFile(file: File): Promise<ParsedFile> {
  // Extract filename without extension as default title
  const fileName = file.name;
  const title = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
  
  // Get file extension (lowercase)
  const extension = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();

  try {
    switch (extension) {
      case '.txt':
      case '.md':
        return await parseTextFile(file, title);
      
      case '.docx':
        return await parseDocxFile(file, title);
      
      default:
        throw new Error(`Unsupported file format: ${extension}`);
    }
  } catch (error) {
    console.error('Failed to parse file:', error);
    throw new Error(`Failed to parse file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Parse plain text files (.txt, .md)
 * Reads file content as UTF-8 text
 */
async function parseTextFile(file: File, title: string): Promise<ParsedFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const content = event.target?.result as string;
      
      if (!content) {
        reject(new Error('Failed to read file content'));
        return;
      }

      // For Markdown files, wrap content in paragraph tags for Tiptap
      // For plain text, also wrap in paragraphs
      const htmlContent = content
        .split(/\n\n+/) // Split by double newlines (paragraphs)
        .filter(para => para.trim())
        .map(para => `<p>${para.replace(/\n/g, '<br>')}</p>`)
        .join('\n');

      resolve({
        title,
        content: htmlContent || '<p></p>', // Return empty paragraph if no content
      });
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    // Read file as UTF-8 text
    reader.readAsText(file, 'UTF-8');
  });
}

/**
 * Parse Word documents (.docx)
 * Converts DOCX to HTML using mammoth
 */
async function parseDocxFile(file: File, title: string): Promise<ParsedFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (event) => {
      const arrayBuffer = event.target?.result as ArrayBuffer;

      if (!arrayBuffer) {
        reject(new Error('Failed to read DOCX file'));
        return;
      }

      try {
        // Convert DOCX to HTML
        const result = await mammoth.convertToHtml({ arrayBuffer });

        // Mammoth returns { value: string, messages: Array }
        // value contains the HTML content
        const content = result.value;

        if (!content) {
          reject(new Error('DOCX file is empty'));
          return;
        }

        // Clean up HTML - mammoth may generate extra wrappers
        // Ensure content is compatible with Tiptap
        const cleanedContent = content.trim() || '<p></p>';

        resolve({
          title,
          content: cleanedContent,
        });

        // Log any conversion warnings/messages (optional)
        if (result.messages.length > 0) {
          console.warn('DOCX conversion messages:', result.messages);
        }
      } catch (error) {
        reject(new Error(`Failed to convert DOCX: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read DOCX file'));
    };

    // Read file as ArrayBuffer for mammoth
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Validate file before parsing
 * Checks file size and format
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  // Maximum file size: 10MB
  const MAX_FILE_SIZE = 10 * 1024 * 1024;
  
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: 'File size exceeds 10MB limit',
    };
  }

  // Check file extension
  const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
  const allowedExtensions = ['.txt', '.md', '.docx'];

  if (!allowedExtensions.includes(extension)) {
    return {
      valid: false,
      error: `Unsupported file format. Allowed: ${allowedExtensions.join(', ')}`,
    };
  }

  return { valid: true };
}

/**
 * Sanitize imported content for Tiptap editor
 * Removes potentially harmful HTML tags and attributes
 */
export function sanitizeContent(html: string): string {
  // Create a temporary div to parse HTML
  if (typeof window === 'undefined') {
    // Server-side: return as-is (basic sanitization)
    return html;
  }

  const temp = document.createElement('div');
  temp.innerHTML = html;

  // Remove script tags
  const scripts = temp.querySelectorAll('script');
  scripts.forEach(script => script.remove());

  // Remove style tags (optional - Tiptap handles styling)
  const styles = temp.querySelectorAll('style');
  styles.forEach(style => style.remove());

  // Remove event handler attributes
  const allElements = temp.querySelectorAll('*');
  allElements.forEach(el => {
    Array.from(el.attributes).forEach(attr => {
      if (attr.name.startsWith('on')) {
        el.removeAttribute(attr.name);
      }
    });
  });

  return temp.innerHTML;
}
