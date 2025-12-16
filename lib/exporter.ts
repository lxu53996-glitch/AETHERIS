import { saveAs } from 'file-saver';
import TurndownService from 'turndown';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import type { ChapterDocument } from './db/schema';

/**
 * Export chapter as Markdown file
 * Converts HTML content to Markdown format and triggers download
 */
export async function downloadMarkdown(chapter: ChapterDocument): Promise<void> {
  try {
    // Initialize Turndown service for HTML to Markdown conversion
    const turndownService = new TurndownService({
      headingStyle: 'atx', // Use # style for headings
      codeBlockStyle: 'fenced', // Use ``` for code blocks
    });

    // Convert HTML content to Markdown
    const markdownContent = turndownService.turndown(chapter.content);

    // Combine title as H1 heading with content
    const fullMarkdown = `# ${chapter.title}\n\n${markdownContent}`;

    // Create blob and trigger download
    const blob = new Blob([fullMarkdown], { 
      type: 'text/markdown;charset=utf-8' 
    });
    
    // Sanitize filename (remove special characters)
    const sanitizedTitle = chapter.title.replace(/[<>:"/\\|?*]/g, '-');
    saveAs(blob, `${sanitizedTitle}.md`);
  } catch (error) {
    console.error('Failed to export Markdown:', error);
    throw new Error('Markdown export failed');
  }
}

/**
 * Export chapter as Word document (.docx)
 * Simplified V1: Converts HTML to plain text via Turndown, then wraps in DOCX
 */
export async function downloadDocx(chapter: ChapterDocument): Promise<void> {
  try {
    // Convert HTML to Markdown first (easier to extract plain text)
    const turndownService = new TurndownService();
    const markdownContent = turndownService.turndown(chapter.content);

    // Strip Markdown formatting to get plain text
    // (For V1, we keep it simple - future versions can parse HTML properly)
    const plainText = markdownContent
      .replace(/^#{1,6}\s+/gm, '') // Remove heading markers
      .replace(/\*\*(.+?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.+?)\*/g, '$1') // Remove italic
      .replace(/\[(.+?)\]\(.+?\)/g, '$1') // Remove links, keep text
      .replace(/`{1,3}(.+?)`{1,3}/g, '$1') // Remove code markers
      .trim();

    // Split content into paragraphs
    const paragraphs = plainText.split(/\n\n+/).filter(p => p.trim());

    // Create Word document
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            // Title as Heading 1
            new Paragraph({
              text: chapter.title,
              heading: HeadingLevel.HEADING_1,
              spacing: {
                after: 240, // 12pt spacing after title
              },
            }),
            // Content paragraphs
            ...paragraphs.map(
              (text) =>
                new Paragraph({
                  children: [
                    new TextRun({
                      text,
                      font: 'Charter', // Serif font for readability
                      size: 24, // 12pt (size is in half-points)
                    }),
                  ],
                  spacing: {
                    after: 200, // 10pt spacing between paragraphs
                  },
                })
            ),
          ],
        },
      ],
    });

    // Generate blob and trigger download
    const blob = await Packer.toBlob(doc);
    
    // Sanitize filename
    const sanitizedTitle = chapter.title.replace(/[<>:"/\\|?*]/g, '-');
    saveAs(blob, `${sanitizedTitle}.docx`);
  } catch (error) {
    console.error('Failed to export DOCX:', error);
    throw new Error('DOCX export failed');
  }
}

/**
 * Export chapter as plain text file
 * Strips all HTML/Markdown formatting
 */
export async function downloadPlainText(chapter: ChapterDocument): Promise<void> {
  try {
    // Convert HTML to Markdown first
    const turndownService = new TurndownService();
    const markdownContent = turndownService.turndown(chapter.content);

    // Strip Markdown formatting
    const plainText = markdownContent
      .replace(/^#{1,6}\s+/gm, '') // Remove headings
      .replace(/\*\*(.+?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.+?)\*/g, '$1') // Remove italic
      .replace(/\[(.+?)\]\(.+?\)/g, '$1') // Remove links
      .replace(/`{1,3}(.+?)`{1,3}/g, '$1') // Remove code
      .trim();

    // Combine title with content
    const fullText = `${chapter.title}\n\n${plainText}`;

    // Create blob and trigger download
    const blob = new Blob([fullText], { 
      type: 'text/plain;charset=utf-8' 
    });
    
    const sanitizedTitle = chapter.title.replace(/[<>:"/\\|?*]/g, '-');
    saveAs(blob, `${sanitizedTitle}.txt`);
  } catch (error) {
    console.error('Failed to export plain text:', error);
    throw new Error('Plain text export failed');
  }
}

/**
 * Export chapter as HTML file
 * Wraps content in a complete HTML document structure
 */
export async function downloadHTML(chapter: ChapterDocument): Promise<void> {
  try {
    // Create a complete HTML document
    const htmlDocument = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${chapter.title}</title>
  <style>
    body {
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
      font-family: Charter, 'Bitstream Charter', 'Sitka Text', Cambria, serif;
      font-size: 16px;
      line-height: 1.75;
      color: #18181b;
    }
    h1 {
      font-size: 32px;
      font-weight: bold;
      margin-bottom: 2rem;
    }
    p {
      margin-bottom: 1rem;
    }
  </style>
</head>
<body>
  <h1>${chapter.title}</h1>
  ${chapter.content}
</body>
</html>`;

    // Create blob and trigger download
    const blob = new Blob([htmlDocument], { 
      type: 'text/html;charset=utf-8' 
    });
    
    const sanitizedTitle = chapter.title.replace(/[<>:"/\\|?*]/g, '-');
    saveAs(blob, `${sanitizedTitle}.html`);
  } catch (error) {
    console.error('Failed to export HTML:', error);
    throw new Error('HTML export failed');
  }
}
