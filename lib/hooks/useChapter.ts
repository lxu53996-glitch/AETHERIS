'use client';

import { useState, useEffect, useCallback } from 'react';
import { getDatabase } from '../db';
import type { ChapterDocument } from '../db/schema';

/**
 * React Hook for interacting with RxDB chapters collection
 * Provides reactive state management and CRUD operations
 * 
 * @param chapterId - The ID of the chapter to subscribe to
 * @returns Chapter document, loading state, and helper functions
 */
export function useChapter(chapterId: string) {
  const [chapter, setChapter] = useState<ChapterDocument | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Subscribe to reactive chapter document
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

        // Subscribe to reactive query for this chapter
        const query = db.chapters.findOne({
          selector: { id: chapterId },
        });

        subscription = query.$.subscribe((doc: any) => {
          if (doc) {
            setChapter(doc.toJSON() as ChapterDocument);
          } else {
            setChapter(null);
          }
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
  }, [chapterId]);

  /**
   * Save/update chapter content
   */
  const saveContent = useCallback(
    async (content: string) => {
      try {
        const db = await getDatabase();
        if (!db) return;

        const existingDoc = await db.chapters.findOne({
          selector: { id: chapterId },
        }).exec();

        if (existingDoc) {
          // Update existing chapter
          await existingDoc.patch({
            content,
            last_edited: new Date().toISOString(),
          });
        } else {
          // Create new chapter if doesn't exist
          await createChapter(content);
        }
      } catch (err) {
        setError(err as Error);
        throw err;
      }
    },
    [chapterId]
  );

  /**
   * Create a new blank chapter
   */
  const createChapter = useCallback(
    async (initialContent: string = '') => {
      try {
        const db = await getDatabase();
        if (!db) return;

        const newChapter: ChapterDocument = {
          id: chapterId,
          title: `Chapter ${chapterId}`,
          content: initialContent,
          last_edited: new Date().toISOString(),
        };

        // Use upsert instead of insert to avoid conflicts
        await db.chapters.upsert(newChapter);
      } catch (err) {
        setError(err as Error);
        throw err;
      }
    },
    [chapterId]
  );

  /**
   * Update chapter title
   */
  const updateTitle = useCallback(
    async (title: string) => {
      try {
        const db = await getDatabase();
        if (!db) return;

        const existingDoc = await db.chapters.findOne({
          selector: { id: chapterId },
        }).exec();

        if (existingDoc) {
          await existingDoc.patch({
            title,
            last_edited: new Date().toISOString(),
          });
        }
      } catch (err) {
        setError(err as Error);
        throw err;
      }
    },
    [chapterId]
  );

  /**
   * Delete the chapter
   */
  const deleteChapter = useCallback(async () => {
    try {
      const db = await getDatabase();
      if (!db) return;

      const existingDoc = await db.chapters.findOne({
        selector: { id: chapterId },
      }).exec();

      if (existingDoc) {
        await existingDoc.remove();
      }
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [chapterId]);

  return {
    chapter,
    isLoading,
    error,
    saveContent,
    createChapter,
    updateTitle,
    deleteChapter,
  };
}
