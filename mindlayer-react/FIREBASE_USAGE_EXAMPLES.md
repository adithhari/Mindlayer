# Firebase Authentication & Storage - Usage Examples

Quick reference for using authentication and Firebase storage in MindLayer components.

---

## 1. Check if User is Logged In

```javascript
import { useAuth } from '../hooks/useAuth';

export default function MyComponent() {
  const { user, isAuthenticated, loading } = useAuth();
  
  if (loading) return <p>Loading...</p>;
  if (!isAuthenticated) return <p>Please log in</p>;
  
  return <p>Welcome, {user.email}!</p>;
}
```

---

## 2. Logout User

```javascript
import { useAuth } from '../hooks/useAuth';

export default function UserMenu() {
  const { logout } = useAuth();
  
  const handleLogout = async () => {
    try {
      await logout();
      // User will be redirected to Auth screen automatically
    } catch (err) {
      console.error('Logout failed:', err.message);
    }
  };
  
  return <button onClick={handleLogout}>Sign out</button>;
}
```

---

## 3. Save User Profile

```javascript
import { useAuth } from '../hooks/useAuth';
import { useFirebaseStorage } from '../hooks/useFirebaseStorage';

export default function ProfileSetup() {
  const { user } = useAuth();
  const { saveUserProfile, loading, error } = useFirebaseStorage();
  
  const handleSaveProfile = async () => {
    try {
      await saveUserProfile({
        name: 'Alice Smith',
        avatar: '👩',
        preferences: {
          theme: 'dark',
          notifications: true,
        }
      });
      console.log('Profile saved!');
    } catch (err) {
      console.error(error);
    }
  };
  
  return (
    <>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <button onClick={handleSaveProfile} disabled={loading}>
        {loading ? 'Saving...' : 'Save Profile'}
      </button>
    </>
  );
}
```

---

## 4. Load User Profile

```javascript
import { useEffect, useState } from 'react';
import { useFirebaseStorage } from '../hooks/useFirebaseStorage';

export default function UserProfile() {
  const { getUserProfile } = useFirebaseStorage();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await getUserProfile();
        setProfile(data);
      } catch (err) {
        console.error('Failed to load profile:', err);
      } finally {
        setLoading(false);
      }
    };
    
    loadProfile();
  }, [getUserProfile]);
  
  if (loading) return <p>Loading profile...</p>;
  if (!profile) return <p>No profile data</p>;
  
  return (
    <div>
      <h2>{profile.name}</h2>
      <p>{profile.avatar}</p>
    </div>
  );
}
```

---

## 5. Save Mood Entry

```javascript
import { useFirebaseStorage } from '../hooks/useFirebaseStorage';

export default function MoodLogger() {
  const { saveMoodEntry, loading, error } = useFirebaseStorage();
  
  const handleLogMood = async (mood, level, notes) => {
    try {
      const entryId = await saveMoodEntry({
        mood,           // 'happy', 'sad', 'anxious', etc.
        level,          // 1-10
        notes,          // Optional: "Had a good day"
        timestamp: Date.now(),
      });
      console.log(`Mood saved with ID: ${entryId}`);
    } catch (err) {
      console.error(error);
    }
  };
  
  return (
    <button 
      onClick={() => handleLogMood('happy', 8, 'Great day!')}
      disabled={loading}
    >
      {loading ? 'Saving...' : 'Log Mood'}
    </button>
  );
}
```

---

## 6. Get All Mood Entries

```javascript
import { useEffect, useState } from 'react';
import { useFirebaseStorage } from '../hooks/useFirebaseStorage';

export default function MoodHistory() {
  const { getMoodEntries } = useFirebaseStorage();
  const [moods, setMoods] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchMoods = async () => {
      try {
        const data = await getMoodEntries();
        setMoods(data);
      } catch (err) {
        console.error('Failed to load moods:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchMoods();
  }, [getMoodEntries]);
  
  if (loading) return <p>Loading...</p>;
  
  return (
    <div>
      <h3>Mood History</h3>
      {moods.length === 0 ? (
        <p>No moods logged yet</p>
      ) : (
        <ul>
          {moods.map((mood) => (
            <li key={mood.id}>
              {mood.mood} ({mood.level}/10) - {mood.notes}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

---

## 7. Save Journal Entry

```javascript
import { useFirebaseStorage } from '../hooks/useFirebaseStorage';

export default function JournalEntry() {
  const { saveJournalEntry, loading } = useFirebaseStorage();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  
  const handleSave = async () => {
    try {
      const entryId = await saveJournalEntry({
        title,
        content,
        mood: 'neutral',
        tags: ['personal', 'reflection'],
      });
      console.log(`Journal saved: ${entryId}`);
      setTitle('');
      setContent('');
    } catch (err) {
      console.error(err);
    }
  };
  
  return (
    <div>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write your thoughts..."
      />
      <button onClick={handleSave} disabled={loading}>
        {loading ? 'Saving...' : 'Save Entry'}
      </button>
    </div>
  );
}
```

---

## 8. Get All Journal Entries

```javascript
import { useEffect, useState } from 'react';
import { useFirebaseStorage } from '../hooks/useFirebaseStorage';

export default function JournalList() {
  const { getJournalEntries } = useFirebaseStorage();
  const [journals, setJournals] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchJournals = async () => {
      try {
        const data = await getJournalEntries();
        // Sort by most recent first
        setJournals(data.sort((a, b) => b.createdAt - a.createdAt));
      } catch (err) {
        console.error('Failed to load journals:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchJournals();
  }, [getJournalEntries]);
  
  if (loading) return <p>Loading journals...</p>;
  
  return (
    <div>
      <h3>My Journals</h3>
      {journals.map((entry) => (
        <article key={entry.id}>
          <h4>{entry.title}</h4>
          <p>{entry.content.substring(0, 100)}...</p>
          <small>Tags: {entry.tags?.join(', ')}</small>
        </article>
      ))}
    </div>
  );
}
```

---

## 9. Save Conversation Message

```javascript
import { useFirebaseStorage } from '../hooks/useFirebaseStorage';

export default function ChatComponent() {
  const { saveConversationMessage, loading } = useFirebaseStorage();
  
  const handleSendMessage = async (text) => {
    try {
      const messageId = await saveConversationMessage({
        role: 'user',              // 'user' or 'assistant'
        content: text,
        timestamp: Date.now(),
      });
      console.log(`Message saved: ${messageId}`);
    } catch (err) {
      console.error(err);
    }
  };
  
  return (
    <button 
      onClick={() => handleSendMessage('How are you?')}
      disabled={loading}
    >
      Send Message
    </button>
  );
}
```

---

## 10. Error Handling Pattern

```javascript
import { useFirebaseStorage } from '../hooks/useFirebaseStorage';

export default function SafeComponent() {
  const { saveUserProfile, error, loading } = useFirebaseStorage();
  
  const handleAction = async () => {
    try {
      await saveUserProfile({ /* data */ });
      // Success - do something
    } catch (err) {
      // Error automatically captured in `error` state
      console.error('Operation failed:', error);
      // Show error message to user
      alert(error);
    }
  };
  
  return (
    <div>
      {error && (
        <div style={{ 
          background: '#ffe6e6', 
          padding: '10px',
          color: 'red'
        }}>
          ❌ {error}
        </div>
      )}
      <button onClick={handleAction} disabled={loading}>
        {loading ? 'Loading...' : 'Do Action'}
      </button>
    </div>
  );
}
```

---

## 11. Real-world Example: Complete Onboarding Flow

```javascript
import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useFirebaseStorage } from '../hooks/useFirebaseStorage';

export default function Onboarding() {
  const { user } = useAuth();
  const { saveUserProfile, saveMoodEntry, loading } = useFirebaseStorage();
  
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [mood, setMood] = useState('');
  const [error, setError] = useState('');
  
  const handleNameSubmit = async () => {
    try {
      await saveUserProfile({
        name,
        email: user.email,
      });
      setStep(1);
    } catch (err) {
      setError(err.message);
    }
  };
  
  const handleMoodSubmit = async () => {
    try {
      await saveMoodEntry({
        mood,
        level: 5,
        notes: 'Initial check-in',
      });
      // Redirect to main app
      window.location.reload();
    } catch (err) {
      setError(err.message);
    }
  };
  
  return (
    <div>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      
      {step === 0 && (
        <div>
          <h2>What's your name?</h2>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
          />
          <button onClick={handleNameSubmit} disabled={loading}>
            Next
          </button>
        </div>
      )}
      
      {step === 1 && (
        <div>
          <h2>How are you feeling?</h2>
          <select value={mood} onChange={(e) => setMood(e.target.value)}>
            <option value="">Select mood</option>
            <option value="happy">Happy</option>
            <option value="sad">Sad</option>
            <option value="anxious">Anxious</option>
            <option value="calm">Calm</option>
          </select>
          <button onClick={handleMoodSubmit} disabled={loading}>
            {loading ? 'Saving...' : 'Get Started'}
          </button>
        </div>
      )}
    </div>
  );
}
```

---

## Tips & Best Practices

### ✅ DO:
- Always check `loading` state before rendering buttons
- Use try/catch for async operations
- Store error messages to display to users
- Call `useFirebaseStorage()` at component level (not in event handlers)
- Check `user` exists before accessing Firebase

### ❌ DON'T:
- Store sensitive data in Firestore without encryption
- Ignore error states
- Make unnecessary Firebase calls in loops
- Assume offline connectivity
- Hardcode user IDs (use `user.uid` from auth)

---

## Need Help?

- See `FIREBASE_SETUP.md` for initial setup
- Check `src/hooks/useFirebaseStorage.js` for all available methods
- Firebase docs: https://firebase.google.com/docs
