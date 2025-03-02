import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Collection References
export const collections = {
  users: "users",
  students: "students",
  attendance: "attendance",
} as const;

/*
Firestore Database Structure:

1. users (collection)
   └── {userId} (document)
       ├── role: "admin"
       ├── username: string
       ├── name: string
       └── createdAt: timestamp

2. students (collection)
   └── {studentId} (document)
       ├── role: "student"
       ├── name: string
       ├── rollNumber: string
       ├── branch: string
       ├── year: number
       ├── batch: string
       ├── username: string
       └── createdAt: timestamp

3. attendance (collection)
   └── {attendanceId} (document)
       ├── date: timestamp
       ├── semester: number
       ├── branch: string
       ├── year: number
       └── records (subcollection)
           └── {recordId} (document)
               ├── studentId: reference
               ├── present: boolean
               └── timestamp: timestamp

Indexes Required:
1. attendance (collection)
   - Compound Index:
     Fields: branch (ASC), year (ASC), date (DESC)

2. students (collection)
   - Compound Index:
     Fields: branch (ASC), year (ASC), name (ASC)
*/