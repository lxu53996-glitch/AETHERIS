/**
 * RxDB <-> Supabase Replication Logic
 * 
 * Purpose:
 * - Bidirectional sync between local RxDB and remote Supabase
 * - Real-time updates via Supabase Realtime
 * - Automatic conflict resolution
 * 
 * Flow:
 * 1. Pull: Fetch updated chapters from Supabase
 * 2. Push: Upload local changes to Supabase
 * 3. Realtime: Subscribe to Postgres changes and trigger re-sync
 */

import { RxDatabase } from 'rxdb';
import { replicateRxCollection, RxReplicationState } from 'rxdb/plugins/replication';
import { supabase } from '../supabase';
import { ChapterDocument } from './schema';
import type { RealtimeChannel } from '@supabase/supabase-js';

type DatabaseCollections = {
  chapters: any;
  entities: any;
};

let replicationState: RxReplicationState<ChapterDocument, any> | null = null;
let realtimeChannel: RealtimeChannel | null = null;

/**
 * Start RxDB <-> Supabase replication
 * 
 * @param db - RxDB database instance
 * @returns Replication state for monitoring/control
 */
export async function startReplication(
  db: RxDatabase<DatabaseCollections>
): Promise<RxReplicationState<ChapterDocument, any> | null> {
  // Guard: Only run on client side
  if (typeof window === 'undefined') {
    console.warn('[Replication] Skipping replication on server side');
    return null;
  }

  // Prevent duplicate replication
  if (replicationState) {
    console.log('[Replication] Already running');
    return replicationState;
  }

  console.log('[Replication] Starting RxDB <-> Supabase sync...');

  try {
    // Initialize replication
    replicationState = replicateRxCollection({
      collection: db.chapters,
      replicationIdentifier: 'supabase-sync-v1',
      
      /**
       * PULL Handler: Fetch data from Supabase -> RxDB
       * 
       * Logic:
       * 1. Get checkpoint (last sync timestamp)
       * 2. Query Supabase for chapters updated after checkpoint
       * 3. Return documents + new checkpoint
       */
      pull: {
        async handler(checkpointOrNull: any, batchSize: number) {
          const checkpoint = checkpointOrNull?.updated_at || '1970-01-01T00:00:00.000Z';
          
          console.log('[Pull] Fetching from checkpoint:', checkpoint);

          // Query Supabase with filters
          const { data, error } = await supabase
            .from('chapters')
            .select('*')
            .gt('updated_at', checkpoint)
            .order('updated_at', { ascending: true })
            .limit(batchSize);

          if (error) {
            console.error('[Pull] Supabase query failed:', error);
            throw error;
          }

          if (!data || data.length === 0) {
            console.log('[Pull] No new documents');
            return {
              documents: [],
              checkpoint: checkpointOrNull,
            };
          }

          console.log(`[Pull] Fetched ${data.length} documents`);

          // Transform Supabase data to RxDB format
          const documents = data.map((row) => ({
            id: row.id,
            title: row.title,
            content: row.content,
            last_edited: row.updated_at,
            // Temporarily disable position sync until Supabase columns are added
            position_x: 0,
            position_y: 0,
          }));

          // New checkpoint = last document's updated_at
          const lastDoc = data[data.length - 1];
          const newCheckpoint = {
            updated_at: lastDoc.updated_at,
          };

          return {
            documents,
            checkpoint: newCheckpoint,
          };
        },
        batchSize: 50,
        modifier: (doc: any) => doc, // No modification needed
      },

      /**
       * PUSH Handler: Upload local changes RxDB -> Supabase
       * 
       * Logic:
       * 1. Receive batch of changed documents
       * 2. Ensure updated_at is set
       * 3. Upsert to Supabase
       */
      push: {
        async handler(changeRows: any) {
          console.log(`[Push] Uploading ${changeRows.length} changes`);

          // Transform RxDB documents to Supabase format
          const rowsToUpsert = changeRows.map((row: any) => {
            const doc = row.newDocumentState;
            return {
              id: doc.id,
              title: doc.title,
              content: doc.content,
              updated_at: doc.last_edited || new Date().toISOString(),
              // Temporarily disable position sync until Supabase columns are added
              // position_x: doc.position_x ?? 0,
              // position_y: doc.position_y ?? 0,
            };
          });

          // Upsert to Supabase (insert or update)
          const { error } = await supabase
            .from('chapters')
            .upsert(rowsToUpsert, {
              onConflict: 'id', // Use id as unique key
            });

          if (error) {
            console.error('[Push] Supabase upsert failed:', error);
            console.error('[Push] Error details:', JSON.stringify(error, null, 2));
            console.error('[Push] Attempted to upsert:', rowsToUpsert);
            throw error;
          }

          console.log('[Push] Successfully uploaded');

          // Return empty array (no conflicts to resolve)
          return [];
        },
        batchSize: 50,
        modifier: (doc: any) => doc,
      },
    });

    // Setup realtime subscription
    setupRealtimeSync(replicationState);

    // Monitor replication events (optional, for debugging)
    replicationState.error$.subscribe((error: any) => {
      console.error('[Replication] Error:', error);
    });

    replicationState.active$.subscribe((active: boolean) => {
      console.log('[Replication] Active:', active);
    });

    console.log('[Replication] Successfully started');
    return replicationState;

  } catch (error) {
    console.error('[Replication] Failed to start:', error);
    replicationState = null;
    return null;
  }
}

/**
 * Setup Supabase Realtime subscription
 * 
 * When remote data changes:
 * 1. Receive postgres_changes event
 * 2. Trigger reSync() to pull new data
 */
function setupRealtimeSync(
  repState: RxReplicationState<ChapterDocument, any>
): void {
  console.log('[Realtime] Setting up Supabase Realtime subscription...');

  // Create channel for chapters table
  realtimeChannel = supabase
    .channel('public:chapters')
    .on(
      'postgres_changes',
      {
        event: '*', // Listen to INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'chapters',
      },
      (payload) => {
        console.log('[Realtime] Change detected:', payload);
        
        // Trigger re-sync to pull latest data
        repState.reSync();
      }
    )
    .subscribe((status) => {
      console.log('[Realtime] Subscription status:', status);
    });
}

/**
 * Stop replication and cleanup
 */
export async function stopReplication(): Promise<void> {
  console.log('[Replication] Stopping...');

  // Cancel replication
  if (replicationState) {
    await replicationState.cancel();
    replicationState = null;
  }

  // Unsubscribe from realtime
  if (realtimeChannel) {
    await supabase.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }

  console.log('[Replication] Stopped');
}

/**
 * Get current replication state
 */
export function getReplicationState(): RxReplicationState<ChapterDocument, any> | null {
  return replicationState;
}
