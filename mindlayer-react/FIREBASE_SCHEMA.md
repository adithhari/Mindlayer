# Firestore Database Schema

## Overview
MindLayer uses Firestore with a hierarchical structure where each user has their own document with subcollections for different data types.

---

## Database Structure

```
firestore/
└── users/                          (collection)
    ├── {userId}/                   (document - auto-created on signup)
    │   ├── uid: string             (unique Firebase user ID)
    │   ├── email: string           (user's email)
    │   ├── name: string            (user's display name)
    │   ├── avatar: string          (avatar emoji or URL)
    │   ├── createdAt: timestamp    (account creation date)
    │   ├── updatedAt: timestamp    (last profile update)
    │   ├── preferences: object     (user settings)
    │   │   ├── theme: string       ("light" or "dark")
    │   │   └── notifications: bool (push notifications enabled)
    │   │
    │   ├── moods/                  (subcollection - mood logs)
    │   │   ├── {docId}/
    │   │   │   ├── mood: string    (e.g., "happy", "sad", "anxious")
    │   │   │   ├── level: number   (1-10 intensity)
    │   │   │   ├── notes: string   (optional user notes)
    │   │   │   ├── timestamp: number
    │   │   │   ├── userId: string  (reference to parent user)
    │   │   │   └── createdAt: timestamp
    │   │   └── ...more mood entries
    │   │
    │   ├── journals/               (subcollection - journal entries)
    │   │   ├── {docId}/
    │   │   │   ├── title: string
    │   │   │   ├── content: string
    │   │   │   ├── mood: string    (mood during entry)
    │   │   │   ├── tags: array     (e.g., ["anxiety", "work"])
    │   │   │   ├── userId: string
    │   │   │   └── createdAt: timestamp
    │   │   └── ...more journal entries
    │   │
    │   ├── conversations/          (subcollection - chat history)
    │   │   ├── {docId}/
    │   │   │   ├── role: string    ("user" or "assistant")
    │   │   │   ├── content: string
    │   │   │   ├── userId: string
    │   │   │   └── createdAt: timestamp
    │   │   └── ...more messages
    │   │
    │   └── habits/                 (subcollection - habit tracking)
    │       ├── {docId}/
    │       │   ├── name: string    (e.g., "Morning walk")
    │       │   ├── frequency: string ("daily", "weekly", "monthly")
    │       │   ├── streak: number  (current streak count)
    │       │   ├── lastCompleted: timestamp
    │       │   ├── userId: string
    │       │   └── createdAt: timestamp
    │       └── ...more habits
    │
    └── {userId2}/
        └── ...same structure as above
```

---

## Collection Details

### Users Collection (`users/{userId}`)
**Purpose:** Store user profile and basic account information

**Fields:**
```javascript
{
  uid: "firebase-user-id-123",
  email: "user@example.com",
  name: "Alice Smith",
  avatar: "👩",
  preferences: {
    theme: "dark",
    notifications: true
  },
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

**Auto-created on:** User signup (via `initializeUserDocument()`)

---

### Moods Subcollection (`users/{userId}/moods`)
**Purpose:** Track user's daily mood logs

**Fields:**
```javascript
{
  mood: "happy",           // "happy", "sad", "angry", "anxious", "calm", "neutral", etc.
  level: 8,               // 1-10 scale (1=worst, 10=best)
  notes: "Had a great day!",  // Optional user notes
  timestamp: 1711705200000,
  userId: "firebase-user-id-123",
  createdAt: Timestamp
}
```

**Created by:** `saveMoodEntry()` hook

---

### Journals Subcollection (`users/{userId}/journals`)
**Purpose:** Store structured journal entries

**Fields:**
```javascript
{
  title: "Reflection on today",
  content: "Today was productive. I completed...",
  mood: "good",           // Current mood when writing
  tags: ["productivity", "gratitude"],  // Categories for filtering
  userId: "firebase-user-id-123",
  createdAt: Timestamp
}
```

**Created by:** `saveJournalEntry()` hook

---

### Conversations Subcollection (`users/{userId}/conversations`)
**Purpose:** Store chat/conversation history with AI

**Fields:**
```javascript
{
  role: "user",           // "user" or "assistant"
  content: "I feel overwhelmed",
  userId: "firebase-user-id-123",
  createdAt: Timestamp
}
```

**Created by:** `saveConversationMessage()` hook

---

### Habits Subcollection (`users/{userId}/habits`)
**Purpose:** Track habits and streaks

**Fields:**
```javascript
{
  name: "Morning meditation",
  frequency: "daily",     // "daily", "weekly", "monthly"
  streak: 5,              // Current streak count
  lastCompleted: Timestamp,
  userId: "firebase-user-id-123",
  createdAt: Timestamp
}
```

**Created by:** `saveHabitEntry()` hook

---

## Security Rules

These rules ensure users can only access their own data:

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Only authenticated users can access their own user document
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth.uid == userId;
    }
  }
}
```

**What this means:**
- ✅ User A can read/write `users/A/moods`
- ❌ User A cannot access `users/B/moods`
- ❌ Unauthenticated users cannot access anything
- ✅ Automatic subcollection security (everything under `users/{userId}/*` is protected)

---

## How Data is Created

### 1. **On Signup** (Auto-created)
```javascript
// When user calls register(email, password)
// → initializeUserDocument() automatically runs
// → Creates users/{uid} with default profile
```

### 2. **User Profile Update** (During Onboarding)
```javascript
const { saveUserProfile } = useFirebaseStorage();
await saveUserProfile({
  name: "Alice",
  avatar: "👩"
});
// Updates users/{uid} document
```

### 3. **Mood Logging** (In Dashboard)
```javascript
const { saveMoodEntry } = useFirebaseStorage();
await saveMoodEntry({
  mood: "happy",
  level: 8,
  notes: "Great day!"
});
// Creates new document in users/{uid}/moods subcollection
```

### 4. **Journal Entry** (In Journal Component)
```javascript
const { saveJournalEntry } = useFirebaseStorage();
await saveJournalEntry({
  title: "My thoughts",
  content: "Today I...",
  mood: "positive",
  tags: ["reflection"]
});
// Creates new document in users/{uid}/journals subcollection
```

---

## Accessing Schema in Firebase Console

### View Users Collection:
1. Open [Firebase Console](https://console.firebase.google.com/)
2. Go to **Firestore Database**
3. Click **`users`** collection
4. You'll see all user documents (one per registered user)

### View Moods Subcollection:
1. Click on a user document (e.g., `users/user-123`)
2. Scroll down to **Subcollections**
3. Click **`moods`** to see all mood entries

### Same for:
- `journals` - Click on user → Click `journals` subcollection
- `conversations` - Click on user → Click `conversations` subcollection
- `habits` - Click on user → Click `habits` subcollection

---

## Index Requirements

Firestore may ask you to create composite indexes for:
- Filtering moods by date range
- Sorting journals by timestamp
- Complex mood + date queries

**When needed:** Firebase Console will show a blue banner with an "Index" link. Just click it to auto-create.

---

## Cost Implications

**Per user (estimated monthly):**
- 10 mood entries/day = 300 reads + 300 writes
- 1 journal entry/day = 30 reads + 30 writes
- 50 conversation messages/day = 1500 reads + 1500 writes
- 5 habit entries/month = 5 reads + 5 writes

**Total:** ~2,135 reads + 1,835 writes per user per month

**Firebase Free Tier:** 1M reads/day + 20K writes/day
- Supports ~500+ active users at this usage pattern
- Cost after free tier: ~$1-5/month per 1000 active users

---

## Backup & Recovery

**Automatic:**
- Firebase maintains 7-day backup history
- Can restore at collection/document level
- No configuration needed

**Manual:**
- Export data via Firebase Console → Data export
- Or use `useFirebaseStorage()` to export via code

---

## Tips & Best Practices

### ✅ DO:
- Store timestamps as `serverTimestamp()` (synced server time)
- Always include `userId` in subcollection documents
- Create indexes when Firebase prompts
- Validate data structure before saving

### ❌ DON'T:
- Store passwords (Firebase handles auth separately)
- Store tokens or API keys in documents
- Create deeply nested structures (use subcollections)
- Query across users (security rules prevent this anyway)

---

## Troubleshooting

**Q: Documents appear empty**
- A: Give Firestore 5-10 seconds after saving (eventual consistency)

**Q: Can't see subcollections?**
- A: Subcollections only appear if they have documents
- A: Save a mood/journal entry first to see subcollection

**Q: Getting "Permission denied" errors?**
- A: Check security rules are published (FIREBASE_SETUP.md Step 3)
- A: Make sure user is authenticated

**Q: Want to delete all data?**
- A: Firestore Console → Select documents → Delete (or delete entire collection)

---

## Next Steps

1. ✅ Schema created (automatically on user signup)
2. ✅ Security rules configured
3. Next: Update components to use Firebase hooks
   - Dashboard → use `saveMoodEntry()` + `getMoodEntries()`
   - Journal → use `saveJournalEntry()` + `getJournalEntries()`
   - Onboarding → use `saveUserProfile()`

---

**Last Updated:** March 28, 2026  
**Status:** ✅ Ready to use  
**Questions?** See FIREBASE_USAGE_EXAMPLES.md
