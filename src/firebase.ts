import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';

// Your live Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyCPpDU9V2MH3-mwmRn3jYOUnLUs8DAoNsQ",
  authDomain: "absensi-homeroom.firebaseapp.com",
  projectId: "absensi-homeroom",
  storageBucket: "absensi-homeroom.firebasestorage.app",
  messagingSenderId: "848184306032",
  appId: "1:848184306032:web:85bdc215dbb75c64b987b5",
  measurementId: "G-4DF46W2TTC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Custom Error Handling according to Firestore best practice guidelines
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test connection on boot is a critical constraint for safe validation
async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'students', 'connection-test-check-id'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Firebase connection is offline. Please check network or config.");
    }
  }
}

testFirestoreConnection();
