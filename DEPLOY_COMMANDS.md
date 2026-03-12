# 🚀 Quick Deployment Commands

## Prerequisites
```bash
# Install Firebase CLI if not already installed
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in your project (if not done)
cd d:\uni\arooj\healthhub
firebase init
# Select: Firestore
# Use existing project: healthhub-5de07
```

---

## Deploy Security Rules
```bash
cd d:\uni\arooj\healthhub
firebase deploy --only firestore:rules
```

**Expected Output**:
```
✔ Deploy complete!

Project Console: https://console.firebase.google.com/project/healthhub-5de07/overview
```

---

## Deploy Composite Indexes
```bash
cd d:\uni\arooj\healthhub
firebase deploy --only firestore:indexes
```

**Expected Output**:
```
✔ Deploy complete!
⚠ Indexes are being created. Check status:
https://console.firebase.google.com/project/healthhub-5de07/firestore/indexes
```

**Note**: Indexes take 5-10 minutes to build

---

## Deploy Both at Once
```bash
cd d:\uni\arooj\healthhub
firebase deploy --only firestore
```

---

## Check Deployment Status
```bash
# Check if rules are deployed
firebase firestore:rules get

# Check if indexes are deployed
firebase firestore:indexes list
```

---

## Test Your App
```bash
# Start development server
npm run dev

# OR if using bun
bun run dev
```

Then open: http://localhost:5173

---

## Verify in Firebase Console

### 1. Check Rules
https://console.firebase.google.com/project/healthhub-5de07/firestore/rules

Should see:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // ... your rules
  }
}
```

### 2. Check Indexes
https://console.firebase.google.com/project/healthhub-5de07/firestore/indexes

Should see 6 indexes:
- dietPlans (userId, status, createdAt)
- dietPlans (userId, createdAt)
- recipes (userId, createdAt)
- labReports (userId, createdAt)
- progressLogs (userId, date)
- aiChatHistory (userId, timestamp)

Status should be: ✅ **Enabled** (green)

### 3. Check Data
https://console.firebase.google.com/project/healthhub-5de07/firestore/data

After testing:
- `users` collection should have your user document
- `dietPlans`, `progressLogs`, etc. should have data

---

## Troubleshooting Commands

### If Firebase CLI not found:
```bash
npm install -g firebase-tools
```

### If login expires:
```bash
firebase logout
firebase login
```

### If project not initialized:
```bash
firebase init firestore
# Select: Use existing project
# Choose: healthhub-5de07
# Firestore rules file: firestore.rules
# Firestore indexes file: firestore.indexes.json
```

### If deployment fails:
```bash
# Check Firebase project
firebase projects:list

# Switch to correct project
firebase use healthhub-5de07

# Try deploying again
firebase deploy --only firestore
```

---

## Common Errors & Fixes

### Error: "No project active"
```bash
firebase use healthhub-5de07
```

### Error: "Permission denied"
```bash
# Re-login
firebase logout
firebase login
```

### Error: "File not found: firestore.rules"
```bash
# Make sure you're in project root
cd d:\uni\arooj\healthhub

# Verify files exist
dir firestore.rules
dir firestore.indexes.json
```

### Error: "Invalid rules syntax"
```bash
# Validate rules file
firebase firestore:rules validate

# If errors, check firestore.rules for syntax issues
```

---

## One-Command Setup (All-in-One)

```bash
cd d:\uni\arooj\healthhub && firebase login && firebase use healthhub-5de07 && firebase deploy --only firestore && npm run dev
```

This will:
1. Navigate to project
2. Login to Firebase (if needed)
3. Select correct project
4. Deploy rules and indexes
5. Start dev server

---

## 📝 Post-Deployment Checklist

- [ ] `firebase deploy --only firestore` completed successfully
- [ ] Firestore Console → Rules shows new rules
- [ ] Firestore Console → Indexes shows 6 indexes
- [ ] All indexes status: ✅ Enabled (green)
- [ ] `npm run dev` starts without errors
- [ ] Browser console shows: `✓ Firebase initialized successfully`
- [ ] Sign up creates user document in `users` collection
- [ ] Dashboard loads without permission errors
- [ ] Diet plans can be created and saved
- [ ] Progress logs can be saved
- [ ] AI chat works and saves history

---

**All commands ready to copy-paste!** 🎯
