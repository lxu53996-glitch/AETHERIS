'use client';

import type { Editor } from '@tiptap/react';
import { useState, useEffect } from 'react';
import { Sparkles, Loader2, ChevronDown, Zap } from 'lucide-react';
import { useSettingsStore } from '@/lib/store/settingsStore';

interface RefactorMenuProps {
  editor: Editor;
}

const REFACTOR_OPTIONS = [
  { label: 'To 3rd Person', instruction: '转换为第三人称' },
  { label: 'To Past Tense', instruction: '转换为过去时态' },
  { label: 'Make it Darker', instruction: '让文字更黑暗、更压抑' },
  { label: 'Make it Epic', instruction: '让文字更史诗、更宏大' },
];

export default function RefactorMenu({ editor }: RefactorMenuProps) {
  const [isRefactoring, setIsRefactoring] = useState(false);
  const [isExpanding, setIsExpanding] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const updatePosition = () => {
      const { from, to, empty } = editor.state.selection;
      
      // Hide if no selection
      if (empty) {
        setIsVisible(false);
        setShowOptions(false);
        return;
      }

      // Get selection coordinates
      const start = editor.view.coordsAtPos(from);
      const end = editor.view.coordsAtPos(to);
      
      // Calculate center position above selection
      const left = (start.left + end.left) / 2 - 80; // 80px offset for centering
      const top = start.top - 60; // 60px above selection
      
      setPosition({ top, left });
      setIsVisible(true);
    };

    // Update on selection change
    const handleUpdate = () => updatePosition();
    editor.on('selectionUpdate', handleUpdate);
    editor.on('update', handleUpdate);

    return () => {
      editor.off('selectionUpdate', handleUpdate);
      editor.off('update', handleUpdate);
    };
  }, [editor]);

  const handleExpand = async () => {
    if (isExpanding || isRefactoring) return;

    // Get selected text
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, ' ');

    if (!selectedText || selectedText.trim().length === 0) {
      alert('请先选择要扩展的摘要');
      setShowOptions(false);
      return;
    }

    setIsExpanding(true);
    setShowOptions(false);

    try {
      // Get settings from store
      const { aiProvider, ollamaUrl, localModel } = useSettingsStore.getState();
      
      // Call Expand API with settings
      const response = await fetch('/api/expand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: selectedText,
          context: '',
          provider: aiProvider,
          ollamaUrl,
          localModel,
        }),
      });

      if (!response.ok) {
        throw new Error('Expand API 调用失败');
      }

      const { content } = await response.json();

      // Store cursor position before deletion
      const { from } = editor.state.selection;

      // Replace selected text with expanded content and mark as AI-generated
      editor
        .chain()
        .focus()
        .deleteSelection()
        .insertContent(content, {
          updateSelection: false,  // Don't update selection yet
        })
        .run();

      // Now apply the AI mark to the inserted content
      const to = from + content.length;
      editor
        .chain()
        .setTextSelection({ from, to })
        .setMark('aiGenerated')
        .setTextSelection(to)  // Move cursor to end, outside the marked content
        .unsetMark('aiGenerated')  // Ensure future typing is unmarked
        .run();

      // Highlight the newly generated content (optional visual feedback)
      // We can select the newly inserted text
      const newTo = from + content.length;
      setTimeout(() => {
        editor.commands.setTextSelection({ from, to: newTo });
      }, 100);
    } catch (error) {
      console.error('Failed to expand text:', error);
      alert('扩展失败，请重试');
    } finally {
      setIsExpanding(false);
    }
  };

  const handleRefactor = async (instruction: string) => {
    if (isRefactoring || isExpanding) return;

    // Get selected text
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, ' ');

    if (!selectedText || selectedText.trim().length === 0) {
      alert('请先选择要重写的文本');
      setShowOptions(false);
      return;
    }

    setIsRefactoring(true);
    setShowOptions(false);

    try {
      // Get settings from store
      const { aiProvider, ollamaUrl, localModel } = useSettingsStore.getState();
      
      // Call Refactor API with settings
      const response = await fetch('/api/refactor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: selectedText,
          instruction,
          context: '',
          provider: aiProvider,
          ollamaUrl,
          localModel,
        }),
      });

      if (!response.ok) {
        throw new Error('Refactor API 调用失败');
      }

      const { rewritten } = await response.json();

      // Store cursor position before deletion
      const { from } = editor.state.selection;

      // Replace selected text with rewritten text and mark as AI-generated
      editor
        .chain()
        .focus()
        .deleteSelection()
        .insertContent(rewritten, {
          updateSelection: false,
        })
        .run();

      // Apply AI mark to the inserted content
      const to = from + rewritten.length;
      editor
        .chain()
        .setTextSelection({ from, to })
        .setMark('aiGenerated')
        .setTextSelection(to)  // Move cursor to end
        .unsetMark('aiGenerated')  // Ensure future typing is unmarked
        .run();
    } catch (error) {
      console.error('Failed to refactor text:', error);
      alert('重写失败，请重试');
    } finally {
      setIsRefactoring(false);
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className="fixed bg-white border-2 border-zinc-900 shadow-lg rounded-md overflow-hidden z-50"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
    >
      <div className="flex flex-col">
        {/* Main Button */}
        <button
          onClick={() => setShowOptions(!showOptions)}
          disabled={isRefactoring || isExpanding}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white text-[13px] font-sans font-bold hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {isRefactoring ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>REFACTORING...</span>
            </>
          ) : isExpanding ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>EXPANDING...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              <span>REFACTOR</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${showOptions ? 'rotate-180' : ''}`} />
            </>
          )}
        </button>

        {/* Dropdown Options */}
        {showOptions && !isRefactoring && !isExpanding && (
          <div className="bg-white border-t-2 border-zinc-900">
            {/* Expand Scene - Special Section */}
            <button
              onClick={handleExpand}
              className="w-full px-4 py-3 text-left text-[13px] font-sans font-bold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all border-b-2 border-zinc-900 whitespace-nowrap flex items-center gap-2"
            >
              <Zap className="w-4 h-4" />
              <span>💥 EXPAND SCENE</span>
            </button>
            
            {/* Refactor Options */}
            <div className="bg-zinc-50 px-3 py-1.5 border-b border-zinc-200">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-sans font-bold">Refactor</span>
            </div>
            {REFACTOR_OPTIONS.map((option, index) => (
              <button
                key={index}
                onClick={() => handleRefactor(option.instruction)}
                className="w-full px-4 py-2 text-left text-[12px] font-sans text-zinc-700 hover:bg-zinc-100 transition-colors border-b border-zinc-200 last:border-b-0 whitespace-nowrap"
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
