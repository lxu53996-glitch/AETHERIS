import { createRxDatabase, addRxPlugin, RxDatabase } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { wrappedValidateAjvStorage } from 'rxdb/plugins/validate-ajv';
import { RxDBMigrationSchemaPlugin } from 'rxdb/plugins/migration-schema';
import { chapterSchema, ChapterDocument, entitySchema, EntityDocument } from './schema';

// Add migration plugin
addRxPlugin(RxDBMigrationSchemaPlugin);
import { startReplication } from './replication';
import { supabase } from '../supabase';

// Enable dev-mode plugin only in development
if (process.env.NODE_ENV === 'development') {
  import('rxdb/plugins/dev-mode').then((module) => {
    addRxPlugin(module.RxDBDevModePlugin);
  });
}

type DatabaseCollections = {
  chapters: any; // RxCollection<ChapterDocument>
  entities: any; // RxCollection<EntityDocument>
};

let dbPromise: Promise<RxDatabase<DatabaseCollections>> | null = null;

/**
 * Singleton function to get or create the RxDB database instance
 * CRITICAL: Only runs on client side (browser)
 * Next.js SSR will crash if RxDB runs on server
 */
export async function getDatabase(): Promise<RxDatabase<DatabaseCollections> | null> {
  // Server-side guard: RxDB only works in browser
  if (typeof window === 'undefined') {
    return null;
  }

  // Return existing instance if already initialized
  if (dbPromise) {
    return dbPromise;
  }

  // Create new database instance
  dbPromise = createRxDatabase<DatabaseCollections>({
    name: 'aetheris_db',
    storage: wrappedValidateAjvStorage({
      storage: getRxStorageDexie(),
    }),
  }).then(async (db) => {
    // Add collections with migration strategies
    await db.addCollections({
      chapters: {
        schema: chapterSchema,
        migrationStrategies: {
          // Migration from version 0 to version 1
          // Add default position_x and position_y for existing documents
          1: function (oldDoc: any) {
            return {
              ...oldDoc,
              position_x: 0,
              position_y: 0,
            };
          },
        },
      },
      entities: {
        schema: entitySchema,
      },
    });

    // Activate replication if user is authenticated
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        console.log('[DB] User authenticated, starting replication...');
        await startReplication(db);
      } else {
        console.log('[DB] No authenticated user, skipping replication');
      }
    } catch (error) {
      console.error('[DB] Failed to check auth session or start replication:', error);
    }

    return db;
  });

  return dbPromise;
}

/**
 * Utility function to get chapters collection
 */
export async function getChaptersCollection() {
  const db = await getDatabase();
  return db?.chapters ?? null;
}
