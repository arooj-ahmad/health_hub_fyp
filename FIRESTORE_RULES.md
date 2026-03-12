# Firestore Security Rules - Quick Setup

## 📋 Copy-Paste Ready Rules for Firebase Console

### Step 1: Navigate to Firebase Console
1. Go to: https://console.firebase.google.com/
2. Select project: **healthhub-5de07**
3. Click **Firestore Database** in left sidebar
4. Click **Rules** tab at the top

### Step 2: Copy & Paste These Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // ============================================================
    // USER PROFILES
    // ============================================================
    match /users/{userId} {
      // Users can only read/write their own profile
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // ============================================================
    // RECIPES
    // ============================================================
    match /recipes/{recipeId} {
      // Anyone authenticated can read all recipes
      allow read: if request.auth != null;
      
      // Anyone authenticated can create recipes
      allow create: if request.auth != null;
      
      // Only recipe owner can update/delete
      allow update, delete: if request.auth != null && 
                             request.auth.uid == resource.data.userId;
    }
    
    // ============================================================
    // DIET PLANS
    // ============================================================
    match /dietPlans/{planId} {
      // Only plan owner can read/write
      allow read, write: if request.auth != null && 
                         request.auth.uid == resource.data.userId;
    }
    
    // ============================================================
    // LAB REPORTS
    // ============================================================
    match /labReports/{reportId} {
      // Only report owner can read/write
      allow read, write: if request.auth != null && 
                         request.auth.uid == resource.data.userId;
    }
    
    // ============================================================
    // PROGRESS LOGS
    // ============================================================
    match /progressLogs/{logId} {
      // Only log owner can read/write
      allow read, write: if request.auth != null && 
                         request.auth.uid == resource.data.userId;
    }
  }
}
```

### Step 3: Publish Rules
1. Click the **Publish** button (blue button at top right)
2. Wait for "Rules published successfully" confirmation

---

## 🔒 Security Explanation

### What These Rules Do:

1. **Authentication Required**: All operations require user to be logged in (`request.auth != null`)

2. **User Profiles** (`/users/{userId}`):
   - ✅ Users can ONLY access their own profile
   - ❌ Cannot read other users' data

3. **Recipes** (`/recipes/{recipeId}`):
   - ✅ All authenticated users can read all recipes (shared resource)
   - ✅ Any authenticated user can create recipes
   - ✅ Only recipe creator can update/delete their own recipes

4. **Diet Plans** (`/dietPlans/{planId}`):
   - ✅ Users can ONLY access their own diet plans
   - ❌ Cannot access other users' plans

5. **Lab Reports** (`/labReports/{reportId}`):
   - ✅ Users can ONLY access their own lab reports
   - ❌ Cannot access other users' medical data

6. **Progress Logs** (`/progressLogs/{logId}`):
   - ✅ Users can ONLY access their own progress logs
   - ❌ Cannot access other users' tracking data

---

## 🧪 Testing Your Rules

### After Publishing Rules, Test:

1. **Create Account**: Sign up should work ✅
2. **View Dashboard**: Should see your own data ✅
3. **Create Diet Plan**: Should save successfully ✅
4. **Browse Recipes**: Should see all recipes ✅
5. **Try to access another user's data**: Should be denied ❌

### Check in Browser Console:
- No "permission-denied" errors for your own data
- Clear error message if trying to access unauthorized data

---

## 🚨 Troubleshooting

### Problem: "Missing or insufficient permissions"

**Cause**: User not authenticated OR trying to access another user's data

**Solution**:
1. Check `console.log(user)` in browser - should show user object
2. Verify `userId` in document matches `request.auth.uid`
3. Make sure user is logged in before trying to write data

### Problem: Rules won't publish

**Cause**: Syntax error in rules

**Solution**:
1. Copy rules exactly as shown above
2. Don't modify the structure
3. Check for missing commas or brackets

### Problem: "resource.data.userId is undefined"

**Cause**: Document doesn't have `userId` field

**Solution**:
1. All documents MUST have `userId` field
2. Check `firestoreService.js` - all create functions add `userId`
3. Example: `createDietPlan(userId, planData)` → saves with `userId` field

---

## 📊 Rule Validation Checklist

Before publishing, ensure:

- [ ] `rules_version = '2';` is at the top
- [ ] `service cloud.firestore` wraps all rules
- [ ] Each collection has proper `match` statement
- [ ] All rules check `request.auth != null`
- [ ] Owner-only rules check `request.auth.uid == resource.data.userId`
- [ ] No syntax errors (red underlines in editor)

---

## 🎯 Quick Reference

### Rule Components:

```javascript
// Check if user is logged in
request.auth != null

// Check if user is document owner
request.auth.uid == resource.data.userId

// Check if user is creating their own document
request.auth.uid == request.resource.data.userId

// Current user ID
request.auth.uid

// Existing document data
resource.data

// Incoming document data (for creates/updates)
request.resource.data
```

---

## 🔗 Useful Links

- **Firebase Rules Documentation**: https://firebase.google.com/docs/firestore/security/get-started
- **Rules Simulator**: Firebase Console → Firestore → Rules → "Rules Playground" tab
- **Your Project Console**: https://console.firebase.google.com/project/healthhub-5de07

---

## ✅ Final Verification

After publishing rules, you should see:

```
✅ Rules published successfully
Last published: [current timestamp]
```

**Your Firestore database is now secure!** 🔒
