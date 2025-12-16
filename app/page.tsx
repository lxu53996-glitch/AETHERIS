'use client';

import { useState, useEffect, useRef } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { getDatabase } from '@/lib/db';
import Editor, { type EditorHandle } from './components/Editor';
import LeftSidebar from './components/LeftSidebar';
import RightSidebar from './components/RightSidebar';
import AuthDialog from './components/AuthDialog';
import SettingsDialog from './components/SettingsDialog';
import BoardView from './components/BoardView';
import { useChapterList } from '@/lib/hooks/useChapterList';

type ViewMode = 'editor' | 'board';

export default function Home() {
  const [aiRatio, setAIRatio] = useState(50);
  const [plotTension, setPlotTension] = useState('calm');
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('editor');
  const editorRef = useRef<EditorHandle>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Get chapter list from RxDB
  const { chapters, createChapter } = useChapterList();

  // Handler to insert AI content into editor
  const handleApplyAIText = (text: string) => {
    editorRef.current?.insertAIContent(text);
  };

  // Handler to update chapter position on whiteboard
  const handleUpdatePosition = async (id: string, x: number, y: number) => {
    console.log('[Page] Updating position for chapter:', id, { x, y });
    try {
      const db = await getDatabase();
      if (!db) {
        console.error('[Page] Database not available');
        return;
      }

      const chapterDoc = await db.chapters.findOne({
        selector: { id },
      }).exec();

      if (chapterDoc) {
        await chapterDoc.patch({
          position_x: x,
          position_y: y,
        });
        console.log('[Page] Position saved successfully');
      } else {
        console.error('[Page] Chapter not found:', id);
      }
    } catch (error) {
      console.error('[Page] Failed to update position:', error);
    }
  };

  // Handler to navigate from whiteboard to editor
  const handleNavigate = (chapterId: string) => {
    console.log('[Page] Navigating to chapter:', chapterId);
    setActiveChapterId(chapterId);
    setViewMode('editor');
  };

  // Session Management
  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Auto-select first chapter if activeId is null but chapters exist
  useEffect(() => {
    if (!activeChapterId && chapters.length > 0) {
      setActiveChapterId(chapters[0].id);
    }
  }, [activeChapterId, chapters]);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-zinc-400 font-sans text-sm">Loading...</p>
      </div>
    );
  }

  // Show auth dialog if not logged in
  if (!session) {
    return <AuthDialog isOpen={true} onClose={() => {}} />;
  }

  // Main authenticated app
  return (
    <>
      {/* Left Sidebar - Resources */}
      <LeftSidebar 
        chapters={chapters}
        activeId={activeChapterId}
        onSelect={setActiveChapterId}
        onCreate={createChapter}
        currentView={viewMode}
        onSwitchView={setViewMode}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />
      
      {/* Right Sidebar - Settings/AI */}
      <RightSidebar 
        onAIRatioChange={setAIRatio}
        onTensionChange={setPlotTension}
        onApply={handleApplyAIText}
        activeChapterId={activeChapterId}
      />
      
      {/* Settings Dialog */}
      <SettingsDialog 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />
      
      {/* Main Content Area - Editor or Board */}
      <div className="min-h-screen flex items-start justify-center p-4 md:p-8 pt-16">
        {viewMode === 'editor' ? (
          // Editor View
          activeChapterId && (
            <Editor 
              ref={editorRef}
              chapterId={activeChapterId}
              aiRatio={aiRatio} 
              plotTension={plotTension} 
            />
          )
        ) : (
          // Whiteboard View
          <div className="w-full h-[calc(100vh-8rem)]">
            <BoardView 
              chapters={chapters}
              onNodeClick={setActiveChapterId}
              onUpdatePosition={handleUpdatePosition}
              onNavigate={handleNavigate}
            />
          </div>
        )}
      </div>
    </>
  );
}
