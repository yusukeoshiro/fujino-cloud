import { env } from '$env/dynamic/private';

import { createRequire } from 'module';
const require = createRequire(import.meta.url ?? __filename);

// eslint-disable-next-line @typescript-eslint/no-require-imports
const admin = require('firebase-admin');

// import { getApps, initializeApp } from 'firebase-admin/app';
// import { getAuth } from 'firebase-admin/auth';
// import { getFirestore } from 'firebase-admin/firestore';

// const { getApps, initializeApp } = admin.app;
const { initializeApp, getApps } = require('firebase-admin/app');

// const { getAuth } = admin.auth;
const { getAuth } = require('firebase-admin/auth');

// const { getFirestore } = admin.firestore;
const { getFirestore } = require('firebase-admin/firestore');

console.log(
	`process.env.GOOGLE_APPLICATION_CREDENTIALS ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`,
);

if (env.GOOGLE_APPLICATION_CREDENTIALS) {
	// Make it visible to Google libs that read process.env at runtime
	process.env.GOOGLE_APPLICATION_CREDENTIALS = env.GOOGLE_APPLICATION_CREDENTIALS;
}

if (!getApps().length) {
	console.log('initializing serverside firebase app');
	initializeApp();
}

export const adminAuth = getAuth();

// TODO I dont know why I need to speficy default here. its really annoying
export const adminDb = getFirestore('default');
