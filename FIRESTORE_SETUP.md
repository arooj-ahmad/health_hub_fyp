# Firestore Database Setup Guide

## Collections Structure

Your app will automatically create these Firestore collections when users interact with features:

### 1. **users/** (User Profiles)
Created when: User completes profile setup
```javascript
{
  uid: "user-id",
  email: "user@example.com",
  displayName: "John Doe",
  age: 30,
  weight: 75,
  height: 175,
  gender: "male",
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### 2. **dietPlans/** (Diet Plans)
Created when: User generates a diet plan via Create Diet Plan page
```javascript
{
  userId: "user-id",
  name: "Weight Loss Plan",
  goal: "Weight Loss",
  duration: "30 days",
  targetCalories: 1500,
  startDate: Timestamp,
  endDate: Timestamp,
  status: "active",
  currentWeight: 75,
  targetWeight: 70,
  activityLevel: "Moderate",
  workoutRoutine: "3x per week",
  dietaryPreferences: "Vegetarian",
  mealCount: 3,
  aiGeneratedPlan: "Full AI response...",
  description: "Summary...",
  meals: [],
  createdAt: Timestamp
}
```

### 3. **labReports/** (Lab Test Reports)
Created when: User uploads and analyzes a lab report
```javascript
{
  userId: "user-id",
  testName: "Blood Test",
  testDate: Timestamp,
  notes: "Annual checkup",
  fileName: "report.jpg",
  fileType: "image/jpeg",
  aiAnalysis: "Full AI analysis...",
  riskLevel: "low" | "medium" | "high",
  findings: "Brief summary...",
  status: "reviewed",
  createdAt: Timestamp
}
```

### 4. **progressLogs/** (Health Progress Tracking)
Created when: User logs progress via Progress Log page
```javascript
{
  userId: "user-id",
  weight: 74.5,
  date: Timestamp,
  bloodPressure: "120/80",
  mood: "Energetic",
  notes: "Feeling great today!",
  createdAt: Timestamp
}
```

### 5. **aiChatHistory/** (AI Doctor Conversations)
Created when: User chats with AI Doctor
```javascript
{
  userId: "user-id",
  role: "user" | "assistant",
  content: "Message text...",
  timestamp: Timestamp,
  createdAt: Timestamp
}
```

### 6. **recipes/** (Recipe Collection)
Pre-seeded with default recipes, users can view and search
```javascript
{
  name: "Greek Salad",
  description: "Fresh Mediterranean salad",
  calories: 320,
  protein: 12,
  carbs: 25,
  fats: 20,
  prepTime: "15 min",
  cookTime: "0 min",
  servings: 2,
  difficulty: "easy",
  ingredients: [...],
  instructions: [...],
  tags: ["vegetarian", "healthy"],
  image: "url",
  createdAt: Timestamp
}
```

## Security Rules (Update in Firebase Console)

Go to Firebase Console → Firestore Database → Rules tab and update:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    match /dietPlans/{planId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }
    
    match /labReports/{reportId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }
    
    match /progressLogs/{logId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }
    
    match /aiChatHistory/{chatId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }
    
    match /recipes/{recipeId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null; // Admin only in production
    }
  }
}
```

## Testing Data Creation

1. **Sign up / Log in** to the app
2. **Create Diet Plan**: Fill form → Click "Generate with AI" → Check Firestore Console for `dietPlans` collection
3. **Upload Lab Report**: Upload image → Analyze → Check `labReports` collection
4. **Log Progress**: Enter weight/metrics → Save → Check `progressLogs` collection
5. **Chat with AI Doctor**: Send messages → Check `aiChatHistory` collection

## Verifying in Firebase Console

1. Open Firebase Console: https://console.firebase.google.com/
2. Select your project
3. Go to **Firestore Database** in left menu
4. You should see collections appear as users interact with features
5. Click any collection to view documents
6. Each document will have a generated ID and the data fields

## Important Notes

- **Collections auto-create**: No need to manually create collections in Firebase Console
- **Authentication required**: Users must be logged in for data to save
- **Timestamps**: All dates use Firebase Timestamp format
- **User isolation**: Data is filtered by `userId` so users only see their own data
- **AI Integration**: All AI features use Groq API (configured in .env)

## Common Issues & Solutions

### Data not appearing in Firestore?
1. Check browser console for errors (F12)
2. Verify user is logged in (check AuthContext)
3. Ensure .env has correct Firebase credentials
4. Check network tab to see if Firestore requests are being made

### Security rules blocking writes?
- Update security rules in Firebase Console (see above)
- Default public rules allow all access (insecure but works for testing)
- Switch to authenticated rules for production

### AI responses not saving?
- Check .env has correct `VITE_GROQ_API_KEY`
- Verify API key is valid in Groq console
- Check browser console for API errors
