'use client';

import { useEffect, useState } from 'react';
import type { Editor } from '@tiptap/react';
import type { EntityDocument } from '@/lib/db/schema';

interface EntityHUDProps {
  editor: Editor | null;
  entities: EntityDocument[];
}

/**
 * Entity HUD - Floating Info Card
 * Displays entity information when clicking on highlighted entity names
 */
export default function EntityHUD({ editor, entities }: EntityHUDProps) {
  const [activeEntity, setActiveEntity] = useState<EntityDocument | null>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!editor) return;

    const updateHUD = () => {
      // Check if highlight is active
      if (!editor.isActive('highlight')) {
        setActiveEntity(null);
        setPosition(null);
        return;
      }

      // Get selected text
      const { from, to } = editor.state.selection;
      const text = editor.state.doc.textBetween(from, to, ' ');

      // Find matching entity (case-insensitive)
      const entity = entities.find(
        (e) => e.name.toLowerCase() === text.toLowerCase()
      );

      if (entity) {
        setActiveEntity(entity);
        
        // Calculate position based on selection
        const { view } = editor;
        const start = view.coordsAtPos(from);
        const end = view.coordsAtPos(to);
        
        setPosition({
          top: start.top - 150, // Position above the text (increased for larger card)
          left: (start.left + end.left) / 2 - 160, // Center horizontally (w-80 = 320px / 2 = 160)
        });
      } else {
        setActiveEntity(null);
        setPosition(null);
      }
    };

    // Update on selection change
    editor.on('selectionUpdate', updateHUD);
    editor.on('update', updateHUD);

    return () => {
      editor.off('selectionUpdate', updateHUD);
      editor.off('update', updateHUD);
    };
  }, [editor, entities]);

  if (!activeEntity || !position) return null;

  return (
    <div
      className="fixed bg-white/90 backdrop-blur-md border border-zinc-200 shadow-xl rounded-md p-3 w-80 max-h-96 z-50 pointer-events-auto overflow-hidden flex flex-col"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2 flex-shrink-0">
        {/* Entity Color Indicator */}
        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: activeEntity.color || '#6B7280' }}
        />
        
        {/* Entity Name */}
        <h3 className="font-serif font-bold text-zinc-900 text-[14px] flex-1 truncate">
          {activeEntity.name}
        </h3>
        
        {/* Entity Type Badge */}
        <span className="font-sans text-[9px] uppercase tracking-wider text-zinc-600 bg-zinc-100 px-1.5 py-0.5 rounded">
          {activeEntity.type}
        </span>
      </div>

      {/* Body - Description (Scrollable) */}
      {activeEntity.description && (
        <div className="flex-1 overflow-y-auto mb-2 pr-1">
          <p className="text-xs text-zinc-600 leading-relaxed whitespace-pre-wrap">
            {activeEntity.description}
          </p>
        </div>
      )}

      {/* Footer - Edit Button (Optional for V1) */}
      <div className="flex justify-end flex-shrink-0">
        <button
          className="font-sans text-[9px] uppercase tracking-wider text-zinc-400 hover:text-zinc-600 transition-colors px-2 py-1"
          onClick={(e) => {
            e.preventDefault();
            // TODO: Open entity editor
            console.log('Edit entity:', activeEntity.id);
          }}
        >
          Edit
        </button>
      </div>
    </div>
  );
}
