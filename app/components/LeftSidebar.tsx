'use client';

import { useState, useEffect } from 'react';
import { Book, List, Plus, Download, FileText, Upload, LogOut, FileEdit, LayoutGrid } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import type { ChapterDocument } from '@/lib/db/schema';
import { downloadMarkdown, downloadDocx } from '@/lib/exporter';
import { parseFile, validateFile } from '@/lib/importer';
import { getDatabase } from '@/lib/db';
import { supabase } from '@/lib/supabase';

interface LeftSidebarProps {
  chapters: ChapterDocument[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => Promise<string>;
  currentView: 'editor' | 'board';
  onSwitchView: (view: 'editor' | 'board') => void;
}

export default function LeftSidebar({ chapters, activeId, onSelect, onCreate, currentView, onSwitchView }: LeftSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  // Track online/offline status
  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    
    // Set initial status
    updateOnlineStatus();
    
    // Listen to online/offline events
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    
    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  // Setup dropzone for file import
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    multiple: true,
    noClick: true, // Prevent click from opening file picker (we have manual button)
    onDrop: async (acceptedFiles) => {
      if (acceptedFiles.length === 0) return;

      setIsImporting(true);
      let lastImportedId: string | null = null;

      try {
        const db = await getDatabase();
        if (!db) {
          console.error('Database not available');
          return;
        }

        for (const file of acceptedFiles) {
          try {
            // Validate file
            const validation = validateFile(file);
            if (!validation.valid) {
              console.error(`File validation failed: ${validation.error}`);
              continue;
            }

            // Parse file content
            const { title, content } = await parseFile(file);

            // Create new chapter
            const newId = await onCreate();

            // Update chapter with imported content
            const chapterDoc = await db.chapters.findOne({
              selector: { id: newId },
            }).exec();

            if (chapterDoc) {
              await chapterDoc.patch({
                title,
                content,
                last_edited: new Date().toISOString(),
              });
            }

            lastImportedId = newId;
          } catch (error) {
            console.error(`Failed to import file ${file.name}:`, error);
          }
        }

        // Switch to last imported chapter
        if (lastImportedId) {
          onSelect(lastImportedId);
        }
      } catch (error) {
        console.error('Import failed:', error);
      } finally {
        setIsImporting(false);
      }
    },
  });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Trigger zone: leftmost 50px of the screen
      if (e.clientX < 50) {
        setIsOpen(true);
      } else if (e.clientX > 320) {
        // Close when mouse leaves sidebar area
        setIsOpen(false);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <>
      {/* Hover trigger zone */}
      <div className="fixed left-0 top-0 w-12 h-full z-40 pointer-events-none" />
      
      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 h-full w-80 z-50 transition-all duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Dropzone Wrapper */}
        <div {...getRootProps()} className="h-full relative">
          <input {...getInputProps()} />
          
          {/* Drag Active Overlay - "Force Field" */}
          {isDragActive && (
            <div className="absolute inset-0 bg-zinc-50/90 z-50 flex items-center justify-center border-2 border-dashed border-[#2563EB]">
              <div className="flex flex-col items-center gap-3">
                <Upload className="w-8 h-8 text-[#2563EB] animate-bounce" />
                <span className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold font-sans">
                  Import File
                </span>
              </div>
            </div>
          )}

          {/* Importing Indicator */}
          {isImporting && (
            <div className="absolute inset-0 bg-zinc-900/50 z-50 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span className="text-[10px] uppercase tracking-widest text-white font-bold font-sans">
                  Importing...
                </span>
              </div>
            </div>
          )}

          {/* Solid Panel */}
          <div className="h-full bg-[#FAF9F6] border-r border-[#EBEAE4] p-6 overflow-y-auto no-scrollbar">
          {/* View Switcher */}
          <section className="mb-6">
            <div className="flex items-center gap-2 p-1 bg-zinc-100 rounded-md">
              {/* Editor View Button */}
              <button
                onClick={() => onSwitchView('editor')}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded transition-colors ${
                  currentView === 'editor' 
                    ? 'bg-white text-zinc-900 shadow-sm' 
                    : 'text-zinc-500 hover:text-zinc-700'
                }`}
                title="Editor View"
              >
                <FileEdit className="w-3.5 h-3.5" />
                <span className="text-[10px] uppercase tracking-wider font-medium font-sans">
                  Editor
                </span>
              </button>
              
              {/* Board View Button */}
              <button
                onClick={() => onSwitchView('board')}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded transition-colors ${
                  currentView === 'board' 
                    ? 'bg-white text-zinc-900 shadow-sm' 
                    : 'text-zinc-500 hover:text-zinc-700'
                }`}
                title="Whiteboard View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="text-[10px] uppercase tracking-wider font-medium font-sans">
                  Board
                </span>
              </button>
            </div>
          </section>

          {/* Imported Books Section */}
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Book className="w-3 h-3 text-zinc-400" />
              <h2 className="font-sans text-[10px] uppercase tracking-[0.05em] text-zinc-400 font-medium">Imported Books</h2>
            </div>
            <div className="space-y-1">
              {[
                'Neuromancer.pdf',
                'Snow Crash.epub',
                'Do Androids Dream.txt',
                'The Diamond Age.pdf',
              ].map((book, i) => (
                <div
                  key={i}
                  className="px-2 py-1.5 hover:bg-zinc-100 transition-colors cursor-pointer rounded-sm"
                >
                  <p className="text-[13px] text-zinc-900 font-sans">{book}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Divider */}
          <div className="border-b border-zinc-200 mb-8" />

          {/* Chapter Outline Section */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <List className="w-3 h-3 text-zinc-400" />
                <h2 className="font-sans text-[10px] uppercase tracking-[0.05em] text-zinc-400 font-medium">Chapters</h2>
              </div>
              {/* New Chapter Button */}
              <button
                onClick={async () => {
                  const newId = await onCreate();
                  onSelect(newId);
                }}
                className="p-1 hover:bg-zinc-200 rounded-sm transition-colors"
                title="New Chapter"
              >
                <Plus className="w-3 h-3 text-zinc-600" />
              </button>
            </div>
            <div className="space-y-1">
              {chapters.map((chapter) => {
                const isActive = chapter.id === activeId;
                return (
                  <div
                    key={chapter.id}
                    onClick={() => onSelect(chapter.id)}
                    className={`px-2 py-2 hover:bg-zinc-100 transition-colors cursor-pointer rounded-sm flex items-center gap-2 ${
                      isActive ? 'bg-zinc-100' : ''
                    }`}
                  >
                    {/* Blue Dot Indicator for Active */}
                    {isActive && (
                      <div className="w-1 h-1 bg-[#2563EB] rounded-full flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={`text-[13px] font-sans text-zinc-900 truncate ${
                        isActive ? 'font-bold' : 'font-semibold'
                      }`}>
                        {chapter.title}
                      </p>
                      <p className="text-[11px] font-sans text-zinc-500 mt-0.5">
                        {new Date(chapter.last_edited).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                );
              })}            </div>
          </section>

          {/* Divider */}
          <div className="border-b border-zinc-200 my-8" />

          {/* Export Actions Section */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Download className="w-3 h-3 text-zinc-400" />
              <h2 className="font-sans text-[10px] uppercase tracking-[0.05em] text-zinc-400 font-medium">Export</h2>
            </div>
            
            {activeId ? (
              <div className="space-y-2">
                {/* Export as Markdown */}
                <button
                  onClick={async () => {
                    const activeChapter = chapters.find(ch => ch.id === activeId);
                    if (activeChapter) {
                      try {
                        await downloadMarkdown(activeChapter);
                      } catch (error) {
                        console.error('Export failed:', error);
                      }
                    }
                  }}
                  className="w-full px-2 py-2 hover:bg-zinc-100 rounded-sm transition-colors flex items-center gap-2 cursor-pointer group"
                >
                  <FileText className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-600" />
                  <span className="text-[10px] uppercase tracking-wider text-zinc-500 group-hover:text-zinc-900 font-medium font-sans">
                    Export .MD
                  </span>
                </button>

                {/* Export as Word */}
                <button
                  onClick={async () => {
                    const activeChapter = chapters.find(ch => ch.id === activeId);
                    if (activeChapter) {
                      try {
                        await downloadDocx(activeChapter);
                      } catch (error) {
                        console.error('Export failed:', error);
                      }
                    }
                  }}
                  className="w-full px-2 py-2 hover:bg-zinc-100 rounded-sm transition-colors flex items-center gap-2 cursor-pointer group"
                >
                  <FileText className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-600" />
                  <span className="text-[10px] uppercase tracking-wider text-zinc-500 group-hover:text-zinc-900 font-medium font-sans">
                    Export .DOCX
                  </span>
                </button>
              </div>
            ) : (
              <p className="text-[11px] font-sans text-zinc-400 italic px-2">
                Select a chapter to export
              </p>
            )}
          </section>

          {/* Sign Out Section with Sync Status */}
          <section className="mt-8 pt-6 border-t border-zinc-200">
            {/* Sync Status Indicator */}
            <div className="mb-3 px-2 py-1.5 flex items-center gap-2">
              <div 
                className={`w-2 h-2 rounded-full ${
                  isOnline ? 'bg-green-500' : 'bg-red-500'
                }`}
                title={isOnline ? 'Cloud Sync Active' : 'Offline - No Cloud Sync'}
              />
              <span className="text-[10px] font-sans text-zinc-400">
                {isOnline ? 'Cloud Sync Active' : 'Offline'}
              </span>
            </div>
            
            {/* Sign Out Button */}
            <button
              onClick={async () => {
                setIsSigningOut(true);
                try {
                  await supabase.auth.signOut();
                } catch (error) {
                  console.error('Sign out failed:', error);
                  setIsSigningOut(false);
                }
              }}
              disabled={isSigningOut}
              className="w-full px-2 py-2 hover:bg-zinc-100 rounded-sm transition-colors flex items-center gap-2 cursor-pointer group disabled:opacity-50"
            >
              <LogOut className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-600" />
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 group-hover:text-zinc-900 font-medium font-sans">
                {isSigningOut ? 'Signing out...' : 'Sign Out'}
              </span>
            </button>
          </section>
        </div>
      </div>
    </div>
    </>
  );
}
