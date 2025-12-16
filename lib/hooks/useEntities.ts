'use client';

import { useState, useEffect, useCallback } from 'react';
import { getDatabase } from '../db';
import type { EntityDocument } from '../db/schema';

/**
 * React Hook for managing entities collection
 * Provides reactive state for entity list and CRUD operations
 * 
 * @returns Entity list, loading state, and helper functions
 */
export function useEntities() {
  const [entities, setEntities] = useState<EntityDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Subscribe to reactive entity list
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

        // Subscribe to reactive query for all entities, sorted by type and name
        const query = db.entities.find({
          sort: [
            { type: 'asc' },
            { name: 'asc' },
          ],
        });

        subscription = query.$.subscribe((docs: any[]) => {
          const entitiesData = docs.map((doc) => doc.toJSON() as EntityDocument);
          setEntities(entitiesData);
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
   * Create a new entity with default values
   * @returns The new entity ID
   */
  const createEntity = useCallback(async (): Promise<string> => {
    try {
      const db = await getDatabase();
      if (!db) throw new Error('Database not available');

      // Generate unique ID using timestamp
      const newId = `entity-${Date.now()}`;

      const newEntity: EntityDocument = {
        id: newId,
        name: 'New Entity',
        type: 'CHARACTER',
        description: '',
        color: '#EF4444', // Red for CHARACTER
        updated_at: new Date().toISOString(),
      };

      await db.entities.upsert(newEntity);
      return newId;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, []);

  /**
   * Delete an entity by ID
   * @param id - The entity ID to delete
   */
  const deleteEntity = useCallback(async (id: string) => {
    try {
      const db = await getDatabase();
      if (!db) return;

      const doc = await db.entities.findOne({
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
   * Update entity name
   * @param id - The entity ID
   * @param name - New name
   */
  const updateEntityName = useCallback(async (id: string, name: string) => {
    try {
      const db = await getDatabase();
      if (!db) return;

      const doc = await db.entities.findOne({
        selector: { id },
      }).exec();

      if (doc) {
        await doc.patch({
          name,
          updated_at: new Date().toISOString(),
        });
      }
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, []);

  /**
   * Update entity type
   * @param id - The entity ID
   * @param type - New type
   */
  const updateEntityType = useCallback(async (id: string, type: EntityDocument['type']) => {
    try {
      const db = await getDatabase();
      if (!db) return;

      const doc = await db.entities.findOne({
        selector: { id },
      }).exec();

      if (doc) {
        // Update color based on type
        const colorMap = {
          CHARACTER: '#EF4444', // Red
          LOCATION: '#3B82F6',  // Blue
          ITEM: '#10B981',      // Green
          LORE: '#8B5CF6',      // Purple
        };

        await doc.patch({
          type,
          color: colorMap[type],
          updated_at: new Date().toISOString(),
        });
      }
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, []);

  return {
    entities,
    isLoading,
    error,
    createEntity,
    deleteEntity,
    updateEntityName,
    updateEntityType,
  };
}
