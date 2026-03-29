# Firebase Integration Guide for MindLayer

## Overview
This guide walks you through setting up Firebase Authentication and Firestore Database for MindLayer.

---

## 1. Create Firebase Project

### Step-by-step:
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Create a project"** or add a new project
3. Project name: `mindlayer` (or your preference)
4. Accept the terms and click **"Create project"**
5. Wait for project creation to complete (~1 minute)

### Enable Firebase Services:
1. Once in your project, go to **Build** menu
2. Click **Authentication** → **Get started**
3. Enable **Email/Password** sign-in method
4. Click on the **Email/Password** provider → **Enable** → **Save**

---

## 2. Get Your Firebase Credentials

### Retrieve Web App Config:
1. In Firebase Console, click the **⚙️ Settings** (gear icon) → **Project settings**
2. Under **"Your apps"**, look for your **Web** app (has `</>` icon)
3. If no web app exists:
   - Click **"Add app"** → Select **Web**
   - Name it `mindlayer-react`
   - Copy the config
4. Copy the entire config object:

```javascript
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "...",
};
```

---

## 3. Configure Environment Variables

### Create `.env.local` file:
In the `mindlayer-react/` folder, create a file named **`.env.local`** (note the dot at the start):

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=sk-your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef123456
```

**Replace the values with your Firebase credentials from Step 2.**

### Verify in .gitignore:
Make sure `.env.local` is in `.gitignore` (it should be by default):
```bash
# In mindlayer-react/.gitignore
.env.local
.env.*.local
```

---

## 4. Set Up Firestore Database

### Create Firestore Database:
1. In Firebase Console, go to **Build** → **Firestore Database**
2. Click **"Create database"**
3. Choose location: **United States (us-central1)** (or nearest to your users)
4. Start in **Production mode** (we'll set rules in next step)
5. Click **"Create"**

### Set Firestore Security Rules:
1. In Firestore, go to **Rules** tab
2. Replace the entire rules with:

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Authenticated users can only access their own data
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth.uid == userId;
    }
  }
}
```

3. Click **"Publish"**

**This ensures users can only read/write their own data.**

---

## 5. Verify Setup in Code

### Check Firebase initialization:
The app automatically initializes Firebase from `src/lib/firebase.js`:

```javascript
// This file reads from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  // ... other fields
};
```

If config is missing, you'll see a console warning.

---

## 6. Install and Run

### Install dependencies:
```bash
cd mindlayer-react
npm install
```

### Run development server:
```bash
npm run dev
```

### Test authentication:
1. Open http://localhost:5173
2. Click **"Sign up"**
3. Enter email and password (min 6 chars)
4. Check the Firebase Console → **Authentication** → **Users** to see your new account
5. Login to test

---

## 7. Project Structure

### New Auth Files:
```
mindlayer-react/
├── src/
│   ├── lib/
│   │   └── firebase.js              ← Firebase config & initialization
│   ├── context/
│   │   ├── AppContext.jsx           ← (already exists)
│   │   └── FirebaseAuthContext.jsx  ← NEW: Auth state management
│   ├── hooks/
│   │   ├── useAuth.js               ← NEW: Custom auth hook
│   │   └── useFirebaseStorage.js    ← NEW: Firestore CRUD operations
│   └── components/
│       ├── Auth/
│       │   ├── Auth.jsx             ← NEW: Login/Signup page
│       │   └── Auth.css             ← NEW: Auth styling
│       └── ...existing components...
├── .env.example                     ← (updated with Firebase vars)
└── .env.local                       ← (create this, never commit)
```

---

## 8. Key Hooks & Usage

### useAuth Hook
Get authentication state and methods:

```javascript
import { useAuth } from './hooks/useAuth';

export default function MyComponent() {
  const { user, login, logout, isAuthenticated } = useAuth();
  
  if (!user) return <p>Not logged in</p>;
  return <p>Welcome, {user.email}</p>;
}
```

### useFirebaseStorage Hook
Save and retrieve user data:

```javascript
import { useFirebaseStorage } from './hooks/useFirebaseStorage';

export default function Dashboard() {
  const { 
    saveUserProfile, 
    getUserProfile,
    saveMoodEntry,
    getMoodEntries,
  } = useFirebaseStorage();
  
  const handleSaveProfile = async () => {
    await saveUserProfile({ name: 'Alice', avatar: '👩' });
  };
  
  const handleLoadProfile = async () => {
    const profile = await getUserProfile();
    console.log(profile);
  };
  
  return (
    <>
      <button onClick={handleSaveProfile}>Save Profile</button>
      <button onClick={handleLoadProfile}>Load Profile</button>
    </>
  );
}
```

---

## 9. Firestore Data Structure

Your data will be organized like this in Firebase:

```
users/
├── user-id-1/
│   ├── uid: "user-id-1"
│   ├── email: "user@example.com"
│   ├── name: "Alice"
│   ├── avatar: "👩"
│   ├── updatedAt: timestamp
│   ├── moods/ (subcollection)
│   │   ├── mood-doc-1
│   │   │   ├── mood: "happy"
│   │   │   ├── level: 8
│   │   │   ├── createdAt: timestamp
│   │   │   └── ...
│   │   └── mood-doc-2
│   ├── journals/ (subcollection)
│   │   ├── journal-doc-1
│   │   │   ├── title: "Good day today"
│   │   │   ├── content: "..."
│   │   │   ├── createdAt: timestamp
│   │   │   └── ...
│   ├── conversations/ (subcollection)
│   │   └── ...
│   └── habits/ (subcollection)
│       └── ...
└── user-id-2/
    └── ...
```

---

## 10. Troubleshooting

### Problem: "Firebase config not fully loaded"
**Solution:** Make sure `.env.local` exists in `mindlayer-react/` folder with all 6 Firebase variables.

### Problem: Auth works but Firestore always fails
**Solution:** Check Firestore Security Rules (Step 4). Make sure rules are published.

### Problem: Can't see users in Firebase Console
**Solution:** 
1. Go to Firebase Console → **Authentication** → **Users**
2. Make sure you enabled **Email/Password** provider
3. Refresh the page

### Problem: "Permission denied" errors in console
**Solution:** Your Firestore rules might be too restrictive. Verify rules match Step 4.

### Problem: Environment variables not loading
**Solution:** 
1. Restart dev server (`npm run dev`)
2. Check variable names start with `VITE_`
3. Sign in/out to refresh auth state

---

## 11. Next Steps

### Migrate Data from localStorage to Firebase:
Update `src/context/AppContext.jsx` to use `useFirebaseStorage()`:

```javascript
import { useFirebaseStorage } from '../hooks/useFirebaseStorage';

export const AppProvider = ({ children }) => {
  const { saveMoodEntry, getMoodEntries } = useFirebaseStorage();
  
  // Use Firebase methods instead of localStorage
  const saveMood = async (mood) => {
    await saveMoodEntry(mood);
  };
  
  // ... rest of logic
};
```

### Enable Additional Auth Methods (Optional):
- Google Sign-in
- Apple Sign-in
- Phone number authentication

See [Firebase Auth Documentation](https://firebase.google.com/docs/auth)

---

## 12. Deployment Checklist

Before deploying to production:
- [ ] Test auth flow (signup, login, logout)
- [ ] Test data persistence (mood saved → refresh → mood still there)
- [ ] Test Firestore rules (security)
- [ ] Never expose `.env.local` (already in .gitignore)
- [ ] Ensure HTTPS forced in Firebase Console settings
- [ ] Test on multiple devices/networks

---

## Questions or Issues?

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firebase Console](https://console.firebase.google.com)
- Team Slack: #mindlayer-firebase
