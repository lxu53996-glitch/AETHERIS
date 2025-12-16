import { RxJsonSchema } from 'rxdb';

/**
 * Chapter schema for RxDB
 * Version: 1 - Added position_x and position_y for whiteboard coordinates
 */
export type ChapterDocument = {
  id: string;
  title: string;
  content: string; // HTML or JSON from Tiptap
  last_edited: string; // ISO date-string
  position_x: number; // X coordinate on whiteboard
  position_y: number; // Y coordinate on whiteboard
};

export const chapterSchema: RxJsonSchema<ChapterDocument> = {
  version: 1,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: {
      type: 'string',
      maxLength: 100,
    },
    title: {
      type: 'string',
    },
    content: {
      type: 'string',
    },
    last_edited: {
      type: 'string',
      format: 'date-time',
    },
    position_x: {
      type: 'number',
      default: 0,
    },
    position_y: {
      type: 'number',
      default: 0,
    },
  },
  required: ['id', 'title', 'content', 'last_edited'],
};

/**
 * Entity schema for RxDB
 * Version: 0
 * Purpose: Store story entities (characters, locations, items, lore) for cross-referencing
 */
export type EntityDocument = {
  id: string;
  name: string; // Entity name to search for in text
  type: 'CHARACTER' | 'LOCATION' | 'ITEM' | 'LORE';
  description: string;
  color: string; // Highlight color
  updated_at: string; // ISO date-string
};

export const entitySchema: RxJsonSchema<EntityDocument> = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: {
      type: 'string',
      maxLength: 100,
    },
    name: {
      type: 'string',
    },
    type: {
      type: 'string',
      enum: ['CHARACTER', 'LOCATION', 'ITEM', 'LORE'],
    },
    description: {
      type: 'string',
    },
    color: {
      type: 'string',
    },
    updated_at: {
      type: 'string',
      format: 'date-time',
    },
  },
  required: ['id', 'name', 'type', 'description', 'color', 'updated_at'],
};
