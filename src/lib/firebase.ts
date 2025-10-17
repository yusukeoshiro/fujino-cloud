// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// Your web app's Firebase configuration
const firebaseConfig = {
	apiKey: 'AIzaSyCz11bWsn0TuE4Gqqg_1pc5EPXbI8v9tr8',
	authDomain: 'fujino-cloud.firebaseapp.com',
	projectId: 'fujino-cloud',
	storageBucket: 'fujino-cloud.firebasestorage.app',
	messagingSenderId: '1025059525577',
	appId: '1:1025059525577:web:c561db33dd75e0fe1e8e18',
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
