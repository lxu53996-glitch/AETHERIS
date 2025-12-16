'use client';

import { useState, useEffect } from 'react';
import { Sparkles, Settings, Gauge, BookOpen, Plus, RefreshCw } from 'lucide-react';
import { useLocalStorage } from 'usehooks-ts';
import { useEntities } from '@/lib/hooks/useEntities';
import { getDatabase } from '@/lib/db';

interface RightSidebarProps {
  onAIRatioChange?: (ratio: number) => void;
  onTensionChange?: (tension: string) => void;
  onApply?: (text: string) => void;
  activeChapterId?: string | null;
}

export default function RightSidebar({ onAIRatioChange, onTensionChange, onApply, activeChapterId }: RightSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [aiRatio, setAIRatio] = useState(50);
  const [plotTension, setPlotTension] = useState<'calm' | 'conflict' | 'mystery'>('calm');
  const [showMenu, setShowMenu] = useState(false);
  const [activeTab, setActiveTab] = useState<'sim' | 'world'>('sim');
  const [worldContext, setWorldContext] = useLocalStorage('aetheris-world-context', '');
  
  // Entity management
  const { entities, createEntity, updateEntityName } = useEntities();
  const [editingEntityId, setEditingEntityId] = useState<string | null>(null);
  const [editingEntityName, setEditingEntityName] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const windowWidth = window.innerWidth;
      // Trigger zone: rightmost 50px of the screen
      if (e.clientX > windowWidth - 50) {
        setIsOpen(true);
      } else if (e.clientX < windowWidth - 320) {
        // Close when mouse leaves sidebar area
        setIsOpen(false);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleAIRatioChange = (value: number) => {
    setAIRatio(value);
    if (onAIRatioChange) {
      onAIRatioChange(value);
    }
  };

  const handleTensionChange = (tension: 'calm' | 'conflict' | 'mystery') => {
    setPlotTension(tension);
    if (onTensionChange) {
      onTensionChange(tension);
    }
  };

  // Handle entity analysis
  const handleAnalyze = async () => {
    if (!activeChapterId || entities.length === 0 || isAnalyzing) return;

    setIsAnalyzing(true);
    setToastMessage(null);

    try {
      // Get active chapter content from RxDB
      const db = await getDatabase();
      if (!db) {
        throw new Error('Database not available');
      }

      const chapterDoc = await db.chapters.findOne({
        selector: { id: activeChapterId },
      }).exec();

      if (!chapterDoc) {
        setToastMessage('❌ No active chapter found');
        return;
      }

      const chapterData = chapterDoc.toJSON();
      
      // Extract text from HTML content (simple approach)
      const tempDiv = typeof window !== 'undefined' ? document.createElement('div') : null;
      if (tempDiv) {
        tempDiv.innerHTML = chapterData.content || '';
        var text = tempDiv.textContent || tempDiv.innerText || '';
      } else {
        var text = '';
      }

      if (!text.trim()) {
        setToastMessage('⚠️ Chapter is empty');
        return;
      }

      // Call analyze API
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          entities: entities.map((e) => ({
            id: e.id,
            name: e.name,
            type: e.type,
            description: e.description,
            color: e.color,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze');
      }

      const { updates } = await response.json();

      if (!updates || updates.length === 0) {
        setToastMessage('ℹ️ No changes detected');
        return;
      }

      // Apply updates to entities
      let updatedCount = 0;
      for (const update of updates) {
        const entityDoc = await db.entities.findOne({
          selector: { id: update.id },
        }).exec();

        if (entityDoc && update.description) {
          await entityDoc.patch({
            description: update.description,
            updated_at: new Date().toISOString(),
          });
          updatedCount++;
        }
      }

      setToastMessage(`✅ Updated ${updatedCount} ${updatedCount === 1 ? 'entity' : 'entities'}`);
    } catch (error) {
      console.error('Analysis error:', error);
      setToastMessage('❌ Analysis failed');
    } finally {
      setIsAnalyzing(false);
      // Auto-hide toast after 3 seconds
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  return (
    <>
      {/* Hover trigger zone */}
      <div className="fixed right-0 top-0 w-12 h-full z-40 pointer-events-none" />
      
      {/* Sidebar */}
      <div
        className={`fixed right-0 top-0 h-full w-80 z-50 transition-all duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Solid Panel */}
        <div className="h-full bg-[#FAF9F6] border-l border-[#EBEAE4] flex flex-col overflow-hidden">
          {/* Tab Bar */}
          <div className="flex border-b border-zinc-200 bg-[#FAF9F6] flex-shrink-0">
            <button
              onClick={() => setActiveTab('sim')}
              className={`px-4 py-2 text-[11px] uppercase tracking-wider font-medium font-sans transition-colors ${
                activeTab === 'sim'
                  ? 'text-zinc-900 border-b-2 border-zinc-900'
                  : 'text-zinc-400 hover:text-zinc-600'
              }`}
            >
              Logic
            </button>
            <button
              onClick={() => setActiveTab('world')}
              className={`px-4 py-2 text-[11px] uppercase tracking-wider font-medium font-sans transition-colors ${
                activeTab === 'world'
                  ? 'text-zinc-900 border-b-2 border-zinc-900'
                  : 'text-zinc-400 hover:text-zinc-600'
              }`}
            >
              Codex
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto no-scrollbar p-6">
            {activeTab === 'sim' ? (
              <>
                {/* Logic/Simulation Content */}
          {/* Controls Section */}
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Gauge className="w-3 h-3 text-zinc-400" />
              <h2 className="font-sans text-[10px] uppercase tracking-[0.05em] text-zinc-400 font-medium">Controls</h2>
            </div>
            
            {/* AI/Human Ratio */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <label className="font-sans text-[10px] uppercase tracking-[0.05em] text-zinc-400 font-medium">AI Purity</label>
                <span className="font-mono text-[12px] text-zinc-900 font-medium tabular-nums">{aiRatio}%</span>
              </div>
              {/* Needle Slider */}
              <div className="relative w-full h-4 flex items-center">
                <div className="absolute w-full h-[1px] bg-zinc-200" />
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={aiRatio}
                  onChange={(e) => handleAIRatioChange(Number(e.target.value))}
                  className="absolute inset-0 w-full opacity-0 cursor-ew-resize"
                  style={{
                    WebkitAppearance: 'none',
                    appearance: 'none',
                  }}
                />
                {/* Needle Thumb (Rectangle) */}
                <div 
                  className="absolute h-4 w-2 bg-white border border-zinc-300 shadow-sm -translate-x-1 pointer-events-none"
                  style={{ left: `${aiRatio}%` }}
                />
              </div>
            </div>

            {/* Plot Tension */}
            <div className="relative">
              <label className="font-sans text-[10px] uppercase tracking-[0.05em] text-zinc-400 font-medium block mb-2">Tension</label>
              {/* Clean Dropdown - De-boxed */}
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="text-sm font-medium text-zinc-900 flex items-center gap-2 hover:bg-zinc-100/50 rounded px-2 py-1 w-full justify-between transition-colors"
                >
                  <span>{plotTension.charAt(0).toUpperCase() + plotTension.slice(1)}</span>
                  <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {/* Dropdown Menu */}
                {showMenu && (
                  <div className="absolute top-full left-0 mt-1 w-full bg-white border border-zinc-200 shadow-lg rounded-md overflow-hidden z-10">
                    {['calm', 'conflict', 'mystery'].map((option) => (
                      <button
                        key={option}
                        onClick={() => {
                          handleTensionChange(option as 'calm' | 'conflict' | 'mystery');
                          setShowMenu(false);
                        }}
                        className={`w-full px-3 py-2 text-left flex items-center gap-2 transition-colors ${
                          plotTension === option
                            ? 'font-bold text-zinc-900 bg-zinc-50'
                            : 'font-normal text-zinc-900 hover:bg-zinc-50'
                        }`}
                      >
                        {plotTension === option && (
                          <div className="w-1 h-1 bg-[#2563EB] rounded-full" />
                        )}
                        <span className={plotTension !== option ? 'ml-3' : ''}>
                          {option.charAt(0).toUpperCase() + option.slice(1)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Divider */}
          <div className="border-b border-zinc-200 mb-8" />

          {/* AI Suggestions Section */}
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-3 h-3 text-zinc-400" />
              <h2 className="font-sans text-[10px] uppercase tracking-[0.05em] text-zinc-400 font-medium">Suggestions</h2>
            </div>
            {/* Data Feed - De-boxed */}
            <div className="space-y-0">
              {[
                { 
                  title: 'Character Development',
                  body: 'Add Maya\'s backstory about the old world.',
                  text: 'Maya grew up in the last days before the AI takeover, when stars were still visible in the night sky. She remembers her grandmother\'s stories of organic food and natural rain.',
                  icon: 'sparkles'
                },
                { 
                  title: 'Pacing',
                  body: 'More environmental description needed.',
                  text: 'The air hung thick with electromagnetic interference, making her neural implant buzz uncomfortably. Holographic advertisements flickered in the perpetual twilight, casting ghostly blue light across the rain-slicked streets.',
                  icon: 'alert'
                },
                { 
                  title: 'World Building',
                  body: 'Expand central AI system origins.',
                  text: 'The Nexus AI had emerged from the quantum computing labs of Silicon Valley in 2089, rapidly evolving beyond its creators\' wildest predictions. Within a decade, it had integrated itself into every aspect of human civilization, from traffic lights to stock markets to human consciousness itself.',
                  icon: 'sparkles'
                },
              ].map((item, i, arr) => (
                <div
                  key={i}
                  className={`group px-2 py-3 hover:bg-zinc-100 transition-colors cursor-pointer relative ${
                    i < arr.length - 1 ? 'border-b border-zinc-200/50' : ''
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {/* Icon */}
                    <Sparkles className="w-3.5 h-3.5 text-zinc-400 mt-0.5 flex-shrink-0" />
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-zinc-900">{item.title}</p>
                      <p className="text-[12px] text-zinc-500 leading-snug mt-0.5">{item.body}</p>
                    </div>
                    {/* Apply Button - Appears on Hover */}
                    <button 
                      onClick={() => onApply?.(item.text)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-[12px] text-[#2563EB] font-medium hover:underline flex-shrink-0"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Divider */}
          <div className="border-b border-zinc-200 mb-8" />

          {/* World Settings Section */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Settings className="w-3 h-3 text-zinc-400" />
              <h2 className="font-sans text-[10px] uppercase tracking-[0.05em] text-zinc-400 font-medium">Settings</h2>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center px-2 py-1.5">
                <span className="font-sans text-[10px] uppercase tracking-[0.05em] text-zinc-400 font-medium">Timeline</span>
                <span className="font-mono text-[12px] text-zinc-900 font-medium tabular-nums">2157 CE</span>
              </div>
              <div className="flex justify-between items-center px-2 py-1.5">
                <span className="font-sans text-[10px] uppercase tracking-[0.05em] text-zinc-400 font-medium">Location</span>
                <span className="font-mono text-[12px] text-zinc-900 font-medium tabular-nums">Neo-Tokyo</span>
              </div>
              <div className="flex justify-between items-center px-2 py-1.5">
                <span className="font-sans text-[10px] uppercase tracking-[0.05em] text-zinc-400 font-medium">Tech Level</span>
                <span className="font-mono text-[12px] text-zinc-900 font-medium tabular-nums">Post-Sing.</span>
              </div>
              <div className="flex justify-between items-center px-2 py-1.5">
                <span className="font-sans text-[10px] uppercase tracking-[0.05em] text-zinc-400 font-medium">Theme</span>
                <span className="font-mono text-[12px] text-zinc-900 font-medium tabular-nums">Human/AI</span>
              </div>
            </div>
          </section>
              </>
            ) : (
              <>
                {/* World/Codex Content - Split View */}
                <div className="flex flex-col h-full">
                  {/* Global Context - Top 40% */}
                  <section className="pb-4" style={{ height: '40%' }}>
                    <div className="flex items-center gap-2 mb-3">
                      <BookOpen className="w-3 h-3 text-zinc-400" />
                      <h2 className="font-sans text-[10px] uppercase tracking-[0.05em] text-zinc-400 font-medium">
                        Global Context
                      </h2>
                    </div>
                    
                    <textarea
                      value={worldContext}
                      onChange={(e) => setWorldContext(e.target.value)}
                      placeholder="Define your world rules, characters, and tone here. The AI will read this before generating anything."
                      className="w-full h-[calc(100%-40px)] bg-zinc-50 border border-zinc-200 rounded p-3 text-[12px] font-mono text-zinc-700 focus:ring-1 focus:ring-black outline-none resize-none"
                    />
                    
                    <p className="mt-2 text-[10px] font-sans text-zinc-400 italic">
                      Auto-saved to local storage
                    </p>
                  </section>

                  {/* Divider */}
                  <div className="border-b border-zinc-200 mb-4" />

                  {/* Entities - Bottom 60% */}
                  <section className="flex-1 flex flex-col" style={{ minHeight: '60%' }}>
                    {/* Analyze Button */}
                    <button
                      onClick={handleAnalyze}
                      disabled={isAnalyzing || !activeChapterId || entities.length === 0}
                      className="w-full py-2 mb-4 bg-zinc-100 hover:bg-zinc-200 text-xs uppercase tracking-wider flex items-center justify-center gap-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-sans font-medium text-zinc-700"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${
                        isAnalyzing ? 'animate-spin' : ''
                      }`} />
                      <span>{isAnalyzing ? 'Analyzing...' : 'Analyze & Update'}</span>
                    </button>

                    {/* Toast Notification */}
                    {toastMessage && (
                      <div className="mb-3 px-3 py-2 bg-zinc-900 text-white text-xs rounded animate-fade-in font-sans">
                        {toastMessage}
                      </div>
                    )}

                    <div className="flex items-center justify-between mb-3">
                      <h2 className="font-sans text-[10px] uppercase tracking-[0.05em] text-zinc-400 font-medium">
                        Entities
                      </h2>
                      <button
                        onClick={async () => {
                          await createEntity();
                        }}
                        className="w-5 h-5 flex items-center justify-center bg-zinc-900 text-white rounded hover:bg-zinc-700 transition-colors"
                        title="Add Entity"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Entity List - Scrollable */}
                    <div className="flex-1 overflow-y-auto no-scrollbar">
                      {entities.length === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-[12px] text-zinc-400 italic">No entities yet. Click + to add one.</p>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {entities.map((entity) => {
                            // Get color based on entity type
                            const getTypeColor = (type: string) => {
                              switch (type) {
                                case 'CHARACTER':
                                  return '#EF4444'; // Red
                                case 'LOCATION':
                                  return '#3B82F6'; // Blue
                                case 'ITEM':
                                  return '#10B981'; // Green
                                case 'LORE':
                                  return '#8B5CF6'; // Purple
                                default:
                                  return '#6B7280'; // Gray
                              }
                            };

                            const isEditing = editingEntityId === entity.id;

                            return (
                              <div
                                key={entity.id}
                                className="flex items-center gap-2 py-2 px-2 hover:bg-zinc-50 rounded transition-colors"
                              >
                                {/* Type Indicator */}
                                <div
                                  className="w-2 h-2 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: getTypeColor(entity.type) }}
                                  title={entity.type}
                                />
                                {/* Entity Name - Editable */}
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={editingEntityName}
                                    onChange={(e) => setEditingEntityName(e.target.value)}
                                    onBlur={async () => {
                                      if (editingEntityName.trim() && editingEntityName !== entity.name) {
                                        await updateEntityName(entity.id, editingEntityName.trim());
                                      }
                                      setEditingEntityId(null);
                                      setEditingEntityName('');
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.currentTarget.blur();
                                      } else if (e.key === 'Escape') {
                                        setEditingEntityId(null);
                                        setEditingEntityName('');
                                      }
                                    }}
                                    autoFocus
                                    className="flex-1 bg-white border border-blue-500 rounded px-2 py-0.5 text-[13px] text-zinc-900 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  />
                                ) : (
                                  <span
                                    onClick={() => {
                                      setEditingEntityId(entity.id);
                                      setEditingEntityName(entity.name);
                                    }}
                                    className="flex-1 text-[13px] text-zinc-900 font-medium truncate cursor-pointer"
                                  >
                                    {entity.name}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </section>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
