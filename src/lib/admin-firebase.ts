import { env } from '$env/dynamic/private';
import { createRequire } from 'module';
const require = createRequire(import.meta.url ?? __filename);

const { initializeApp, getApps } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');

if (env.GOOGLE_APPLICATION_CREDENTIALS) {
	// Make it visible to Google libs that read process.env at runtime
	process.env.GOOGLE_APPLICATION_CREDENTIALS = env.GOOGLE_APPLICATION_CREDENTIALS;
}

if (!getApps().length) {
	console.log('initializing serverside firebase app');
	initializeApp();
}

export const adminAuth = getAuth();

const databaseId = env.FIRESTORE_DATABASE_ID || 'default';

// TODO I dont know why I need to speficy default here. its really annoying
export const adminDb = getFirestore(databaseId);

if (!env.FIREBASE_STORAGE_BUCKET) {
	throw new Error('FIREBASE_STORAGE_BUCKET is required.');
}
export const adminStorage = getStorage().bucket(env.FIREBASE_STORAGE_BUCKET);
