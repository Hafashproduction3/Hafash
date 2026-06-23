'use client';

/**
 * Barrel file for Firebase functionality.
 * Imports from specific files to maintain clean dependency graph.
 */

export { initializeFirebase } from './init';
export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './auth/use-user';
