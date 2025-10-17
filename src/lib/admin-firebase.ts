import { env } from '$env/dynamic/private';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

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
