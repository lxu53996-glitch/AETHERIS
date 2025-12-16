'use client';

import { useState, useEffect, useCallback } from 'react';
import { getDatabase } from '../db';
import type { ChapterDocument } from '../db/schema';

/**
 * React Hook for managing the list of all chapters
 * Provides reactive state for chapter list and CRUD operations
 * 
 * @returns Chapter list, loading state, and helper functions
 */
export function useChapterList() {
  const [chapters, setChapters] = useState<ChapterDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Subscribe to reactive chapter list
  useEffect(() => {
    let subscription: any = null;

    const initSubscription = async () => {
      try {
        const db = await getDatabase();
        
        // Server-side guard: skip if no database instance
        if (!db) {
          setIsLoading(false);
          return;
        }

        // Subscribe to reactive query for all chapters, sorted by last_edited (descending)
        const query = db.chapters.find({
          sort: [{ last_edited: 'desc' }],
        });

        subscription = query.$.subscribe((docs: any[]) => {
          const chaptersData = docs.map((doc) => doc.toJSON() as ChapterDocument);
          setChapters(chaptersData);
          setIsLoading(false);
        });
      } catch (err) {
        setError(err as Error);
        setIsLoading(false);
      }
    };

    initSubscription();

    // Cleanup subscription on unmount
    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  /**
   * Create a new chapter with unique ID
   * @returns The new chapter ID
   */
  const createChapter = useCallback(async (): Promise<string> => {
    try {
      const db = await getDatabase();
      if (!db) throw new Error('Database not available');

      // Generate unique ID using timestamp
      const newId = `chapter-${Date.now()}`;

      const newChapter: ChapterDocument = {
        id: newId,
        title: 'Untitled Chapter',
        content: '',
        last_edited: new Date().toISOString(),
      };

      await db.chapters.upsert(newChapter);
      return newId;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, []);

  /**
   * Delete a chapter by ID
   * @param id - The chapter ID to delete
   */
  const deleteChapter = useCallback(async (id: string) => {
    try {
      const db = await getDatabase();
      if (!db) return;

      const doc = await db.chapters.findOne({
        selector: { id },
      }).exec();

      if (doc) {
        await doc.remove();
      }
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, []);

  /**
   * Update chapter title
   * @param id - The chapter ID
   * @param title - New title
   */
  const updateChapterTitle = useCallback(async (id: string, title: string) => {
    try {
      const db = await getDatabase();
      if (!db) return;

      const doc = await db.chapters.findOne({
        selector: { id },
      }).exec();

      if (doc) {
        await doc.patch({
          title,
          last_edited: new Date().toISOString(),
        });
      }
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, []);

  return {
    chapters,
    isLoading,
    error,
    createChapter,
    deleteChapter,
    updateChapterTitle,
  };
}
