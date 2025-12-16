'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import { useEffect, useState, useRef, forwardRef, useImperativeHandle } from 'react';
import { Sparkles, Loader2, Scan, Users } from 'lucide-react';
import { useDebouncedCallback } from 'use-debounce';
import { generatePlotBranches, type PlotBranch } from '@/lib/ai-client';
import { useChapter } from '@/lib/hooks/useChapter';
import { useEntities } from '@/lib/hooks/useEntities';
import { useSettingsStore } from '@/lib/store/settingsStore';
import EntityHUD from './EntityHUD';
import CouncilPanel from './CouncilPanel';
import RefactorMenu from './RefactorMenu';

interface EditorProps {
  chapterId: string;
  aiRatio?: number;
  plotTension?: string;
}

// 暴露给父组件的方法类型
export interface EditorHandle {
  insertAIContent: (text: string) => void;
}

const MOCK_CONTENT = `
<h1>Chapter 1: The Neon Abyss</h1>

<p>The rain fell in sheets of electric blue, each droplet carrying fragments of data from the city's neural network. Maya stood at the edge of the Obsidian Tower, her neural interface humming softly beneath her temple, watching the cascading streams of information paint the night sky with phosphorescent patterns.</p>

<p>Below, the undercity sprawled like a circuit board gone mad—millions of souls connected, yet utterly alone. Hovercars traced luminous paths through the smog, their autopilots synced to the central AI that governed every breath, every transaction, every dream. She remembered when the sky was dark, when stars existed beyond the perpetual glow of advertisements projected onto the cloud layer.</p>

<p>"You're late," whispered a voice through her auditory implant. The words materialized as glowing text in her peripheral vision, signed with a cryptographic signature she recognized instantly. Her handler. The one person—or algorithm—she couldn't afford to ignore. Maya's fingers twitched, activating the subdermal keyboard embedded in her forearm, typing a response that existed only in electromagnetic fields: "The void waits for no one."</p>
`;

const Editor = forwardRef<EditorHandle, EditorProps>(function Editor(
  { chapterId, aiRatio = 50, plotTension = 'calm' },
  ref
) {
  const [showBranches, setShowBranches] = useState(false);
  const [branches, setBranches] = useState<PlotBranch[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const hasLoadedChapter = useRef(false);
  const [localTitle, setLocalTitle] = useState('');
  const isUserTyping = useRef(false); // Track if user is actively editing
  const [isLensActive, setIsLensActive] = useState(false);
  
  // Council state
  const [showCouncil, setShowCouncil] = useState(false);
  const [isCouncilLoading, setIsCouncilLoading] = useState(false);
  const [councilData, setCouncilData] = useState<{
    reviews: Array<{ role: string; score: number; comment: string }>;
    overall_verdict: string;
  } | null>(null);

  // RxDB integration - dynamic chapter ID
  const { chapter, saveContent, createChapter, updateTitle } = useChapter(chapterId);
  const { entities } = useEntities();

  // Expose insertAIContent method to parent via ref
  useImperativeHandle(ref, () => ({
    insertAIContent: (text: string) => {
      if (editor) {
        // Insert at current cursor position, then move cursor to end of inserted text
        editor.chain().focus().insertContent(text).run();
      }
    },
  }));

  // Debounced title save function
  const debouncedSaveTitle = useDebouncedCallback(
    async (title: string) => {
      if (title.trim() && title !== chapter?.title) {
        try {
          await updateTitle(title.trim());
        } catch (error) {
          console.error('Failed to save title:', error);
        }
      }
    },
    1000
  );

  // Debounced auto-save function (1000ms delay)
  const debouncedSave = useDebouncedCallback(
    async (content: string) => {
      try {
        setSaveStatus('saving');
        await saveContent(content);
        setSaveStatus('saved');
        
        // Reset to idle after 2 seconds
        setTimeout(() => {
          setSaveStatus('idle');
          isUserTyping.current = false; // Save complete, reset typing flag
        }, 2000);
      } catch (error) {
        console.error('Save failed:', error);
        setSaveStatus('idle');
      }
    },
    1000
  );

  const editor = useEditor({
    extensions: [
      StarterKit,
      Highlight.configure({ multicolor: true }),
    ],
    content: '', // Start empty, will be populated from RxDB
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'focus:outline-none min-h-screen px-8 py-16 font-serif text-[16px] text-zinc-900 leading-[1.75] caret-[#2563EB]',
      },
    },
    onUpdate: ({ editor }) => {
      isUserTyping.current = true; // User is typing
      // Trigger auto-save on content change
      const html = editor.getHTML();
      debouncedSave(html);
    },
  });

  // Initialize editor with content from RxDB
  useEffect(() => {
    if (!editor || !chapter) return;

    // Skip updating content if user is actively typing (auto-save triggered update)
    if (isUserTyping.current) {
      // Just sync title, don't touch editor content
      setLocalTitle(chapter.title);
      return;
    }

    // Load chapter content (empty string for new chapters)
    editor.commands.setContent(chapter.content || '');
    // Only auto-focus on first load, not on subsequent updates
    if (!hasLoadedChapter.current) {
      editor.commands.focus('end');
    }
    hasLoadedChapter.current = true;
    
    // Sync local title with chapter title
    setLocalTitle(chapter.title);
  }, [chapterId, editor, chapter]);

  // Reset loaded flag when chapter changes
  useEffect(() => {
    hasLoadedChapter.current = false;
    isUserTyping.current = false; // Reset typing flag on chapter switch
  }, [chapterId]);



  const handleSimulate = async () => {
    setShowBranches(true);
    setIsSimulating(true);
    setBranches([]);

    // Get settings from store
    const { aiProvider, ollamaUrl, localModel } = useSettingsStore.getState();
    
    // Get current editor content as prompt
    const prompt = editor?.getText() || 'Continue the story...';

    // Determine logic mode based on plot tension
    const logicMode = plotTension === 'mystery' ? 'creative' : plotTension === 'conflict' ? 'logical' : 'balanced';

    // Read world context from local storage
    const worldContext = typeof window !== 'undefined' ? localStorage.getItem('aetheris-world-context') || '' : '';

    await generatePlotBranches({
      prompt,
      logicMode: logicMode as 'creative' | 'logical' | 'balanced',
      context: worldContext,
      provider: aiProvider,
      ollamaUrl,
      localModel,
      onBranchStart: ({ id, title, index }) => {
        setBranches((prev) => [
          ...prev,
          { id, title, description: '', isStreaming: true },
        ]);
      },
      onTextChunk: ({ id, text }) => {
        setBranches((prev) =>
          prev.map((branch) =>
            branch.id === id
              ? { ...branch, description: branch.description + text }
              : branch
          )
        );
      },
      onBranchComplete: ({ id }) => {
        setBranches((prev) =>
          prev.map((branch) =>
            branch.id === id ? { ...branch, isStreaming: false } : branch
          )
        );
      },
      onComplete: () => {
        setIsSimulating(false);
      },
      onError: (error) => {
        console.error('Simulation error:', error);
        setIsSimulating(false);
      },
    });
  };

  const handleBranchSelect = (branchId: string) => {
    const selectedBranch = branches.find((b) => b.id === branchId);
    if (selectedBranch && editor) {
      // Insert at cursor position, cursor will be at end of inserted text
      editor.chain().focus().insertContent(`\n\n${selectedBranch.description}`).run();
      setShowBranches(false);
      setBranches([]);
    }
  };

  // Toggle Holographic Lens (Entity Highlighter)
  const toggleLens = () => {
    if (!editor) return;

    if (isLensActive) {
      // Turn OFF: Remove all highlights from entire document
      const { doc } = editor.state;
      const currentSelection = editor.state.selection; // Save current position
      
      editor
        .chain()
        .setTextSelection({ from: 0, to: doc.content.size })
        .unsetHighlight()
        .setTextSelection(currentSelection) // Restore cursor position
        .run();
      
      setIsLensActive(false);
    } else {
      // Turn ON: Scan and highlight entities
      setIsLensActive(true);

      // Save current cursor position
      const currentSelection = editor.state.selection;

      // Traverse the document to find and highlight entity names
      const { doc } = editor.state;
      const tr = editor.state.tr;

      entities.forEach((entity) => {
        const entityName = entity.name.toLowerCase();
        
        doc.descendants((node, pos) => {
          if (node.isText && node.text) {
            const text = node.text.toLowerCase();
            let index = 0;
            
            while ((index = text.indexOf(entityName, index)) !== -1) {
              const from = pos + index;
              const to = from + entityName.length;
              
              // Apply highlight mark
              editor
                .chain()
                .setTextSelection({ from, to })
                .setHighlight({ color: entity.color || '#ffcc00' })
                .run();
              
              index += entityName.length;
            }
          }
        });
      });

      // Restore original cursor position
      editor.commands.setTextSelection(currentSelection);
    }
  };

  // Handle title change
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setLocalTitle(newTitle);
    debouncedSaveTitle(newTitle);
  };

  // Summon AI Council
  const handleSummonCouncil = async () => {
    if (!editor || isCouncilLoading) return;

    setIsCouncilLoading(true);

    try {
      // Get settings from store
      const { aiProvider, ollamaUrl, localModel } = useSettingsStore.getState();
      
      // Extract plain text from editor
      const text = editor.getText();

      if (!text || text.trim().length === 0) {
        alert('章节内容为空，无法召唤评审团');
        setIsCouncilLoading(false);
        return;
      }

      // Call Council API with settings
      const response = await fetch('/api/council', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text, 
          context: '',
          provider: aiProvider,
          ollamaUrl,
          localModel,
        }),
      });

      if (!response.ok) {
        throw new Error('Council API 调用失败');
      }

      const data = await response.json();
      setCouncilData(data);
      setShowCouncil(true);
    } catch (error) {
      console.error('Failed to summon council:', error);
      alert('召唤评审团失败，请重试');
    } finally {
      setIsCouncilLoading(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto flex gap-6 relative">
      {/* Main Editor Area */}
      <div className={`mx-auto max-w-[65ch] transition-all duration-500 ${showBranches ? 'w-[55%]' : 'w-full'}`}>
        {/* Content Surface */}
        <div 
          className="relative rounded-md transition-all duration-300 bg-white border border-zinc-200"
        >
          {/* Save Status Indicator */}
          {saveStatus !== 'idle' && (
            <div className="absolute top-4 right-6 z-10">
              <span
                className={`text-[10px] uppercase tracking-wider font-medium font-sans transition-colors duration-300 ${
                  saveStatus === 'saving' ? 'text-zinc-400' : 'text-emerald-600'
                }`}
              >
                {saveStatus === 'saving' ? 'SAVING...' : 'SAVED'}
              </span>
            </div>
          )}
          
          {/* Editable Title Header with Lens Button */}
          <div className="px-8 pt-16">
            <div className="flex items-center gap-3 mb-8">
              <input
                type="text"
                value={localTitle}
                onChange={handleTitleChange}
                placeholder="Untitled Chapter"
                className="flex-1 bg-transparent border-none outline-none text-[32px] font-bold text-zinc-900 placeholder-zinc-300 font-serif focus:ring-0"
              />
              {/* Lens Button */}
              <button
                onClick={toggleLens}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[13px] font-sans transition-all ${
                  isLensActive
                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/50'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                }`}
                title={isLensActive ? 'Deactivate Entity Lens' : 'Activate Entity Lens'}
              >
                <Scan className={`w-3.5 h-3.5 ${
                  isLensActive ? 'animate-pulse' : ''
                }`} />
                <span>Lens</span>
              </button>
              
              {/* Council Button */}
              <button
                onClick={handleSummonCouncil}
                disabled={isCouncilLoading}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md text-[13px] font-sans transition-all bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Summon AI Council"
              >
                {isCouncilLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Summoning...</span>
                  </>
                ) : (
                  <>
                    <Users className="w-3.5 h-3.5" />
                    <span>Council</span>
                  </>
                )}
              </button>
            </div>
          </div>
          
          <EditorContent editor={editor} />
          
          {/* Entity HUD - Floating Info Card */}
          {editor && <EntityHUD editor={editor} entities={entities} />}
          
          {/* Refactor Menu - Text Selection Toolbar */}
          {editor && <RefactorMenu editor={editor} />}
          
          {/* Simulate Button - UI Element */}
          <div className="absolute bottom-6 right-6">
            <button
              onClick={handleSimulate}
              disabled={isSimulating}
              className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 text-white text-[13px] font-sans rounded-md hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSimulating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  Simulate
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Time River Branches */}
      {showBranches && (
        <div className="w-[45%] relative">
          {/* SVG Circuit Lines Layer */}
          <svg 
            className="absolute left-0 top-0 w-full h-full pointer-events-none" 
            style={{ zIndex: 0 }}
          >
            <defs>
              {/* Junction Circle Definition */}
              <marker
                id="junction"
                markerWidth="8"
                markerHeight="8"
                refX="4"
                refY="4"
              >
                <circle
                  cx="4"
                  cy="4"
                  r="3"
                  fill="#FAF9F6"
                  stroke="#D4D4D8"
                  strokeWidth="1.5"
                />
              </marker>
            </defs>

            {/* Main Trunk Line (from editor to junction) */}
            <line
              x1="0"
              y1="250"
              x2="60"
              y2="250"
              stroke="#E4E4E7"
              strokeWidth="1.5"
            />

            {/* Junction Point */}
            <circle
              cx="60"
              cy="250"
              r="3"
              fill="#FAF9F6"
              stroke="#D4D4D8"
              strokeWidth="1.5"
            />

            {/* Orthogonal Branch Lines (90-degree angles) */}
            {branches.map((branch, index) => {
              const yPositions = [80, 250, 420]; // Branch card vertical positions
              const targetY = yPositions[index] || 250;
              const junctionX = 60;
              const junctionY = 250;
              const branchStartX = 120;

              return (
                <g key={branch.id}>
                  {/* Vertical segment from junction */}
                  <line
                    x1={junctionX}
                    y1={junctionY}
                    x2={junctionX}
                    y2={targetY}
                    stroke="#E4E4E7"
                    strokeWidth="1.5"
                    opacity={branch.isStreaming ? "0.3" : "1"}
                    className="transition-opacity duration-500"
                  />
                  
                  {/* Horizontal segment to branch card */}
                  <line
                    x1={junctionX}
                    y1={targetY}
                    x2={branchStartX}
                    y2={targetY}
                    stroke="#E4E4E7"
                    strokeWidth="1.5"
                    opacity={branch.isStreaming ? "0.3" : "1"}
                    className="transition-opacity duration-500"
                  />

                  {/* Connection point at branch card */}
                  <circle
                    cx={branchStartX}
                    cy={targetY}
                    r="2.5"
                    fill="#2563EB"
                    opacity={branch.isStreaming ? "0" : "1"}
                    className="transition-opacity duration-300"
                  />
                </g>
              );
            })}
          </svg>

          {/* Branch Cards */}
          <div className="space-y-4 relative z-10">
            {branches.map((branch, index) => (
              <div
                key={branch.id}
                onClick={() => !branch.isStreaming && handleBranchSelect(branch.id)}
                className={`group transform transition-all duration-300 ${
                  branch.isStreaming ? 'cursor-default' : 'cursor-pointer hover:scale-105'
                }`}
                style={{
                  animation: `slideInRight 0.5s ease-out ${index * 0.15}s both`
                }}
              >
                <div
                  className="relative p-4 rounded-md border border-zinc-200 bg-white transition-all duration-300"
                >
                  {/* Branch Label */}
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-6 h-6 rounded-sm flex items-center justify-center text-[11px] font-sans font-bold bg-zinc-100 text-zinc-900"
                    >
                      {branch.id}
                    </div>
                    <h3 className="font-sans text-[13px] font-semibold text-zinc-900">
                      {branch.title}
                    </h3>
                    {branch.isStreaming && (
                      <Loader2 className="w-3 h-3 text-zinc-400 animate-spin ml-auto" />
                    )}
                  </div>

                  {/* Branch Description with Typewriter Effect */}
                  <p className="text-[13px] font-sans text-zinc-600 leading-relaxed">
                    {branch.description}
                    {branch.isStreaming && (
                      <span className="inline-block w-0.5 h-4 bg-[#2563EB] ml-0.5 animate-pulse" />
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Council Panel */}
      {showCouncil && councilData && (
        <CouncilPanel
          reviews={councilData.reviews}
          overallVerdict={councilData.overall_verdict}
          onClose={() => setShowCouncil(false)}
        />
      )}
    </div>
  );
});

Editor.displayName = 'Editor';

export default Editor;
