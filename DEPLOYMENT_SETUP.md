# Firebase Deployment Setup Guide

## 🔥 Firebase Configuration

Your Safety Alert app is connected to Firebase project: **mountain-sentinel**

### Firebase Services Used:

- ✅ **Authentication** - User accounts (jennyasas14@gmail.com is primary admin)
- ✅ **Firestore Database** - All reports, incidents, and user data
- ✅ **Cloud Storage** - Image uploads for reports
- ✅ **Cloud Functions** - Auto-admin setup and backend logic

---

## 🔐 Primary Admin Account

**Email**: `jennyasas14@gmail.com`  
**Password**: `Rememberme14`  
**Role**: Primary Admin (permanent)

### ✨ Automatic Admin Setup

The app automatically ensures `jennyasas14@gmail.com` has admin privileges:

1. **On User Creation** - Cloud Function `setAdminOnUserCreate` automatically sets admin claim
2. **On Every Login** - Cloud Function `verifyAdminOnSignIn` verifies and restores admin if needed
3. **Firestore Document** - Creates user document with `role: 'admin'` and `isPrimaryAdmin: true`

---

## 🚀 Deployment Steps

### 1. Clone Repository

```bash
git clone https://github.com/jennyAsas/FINALS_EXAM_APPDEV1.git
cd FINALS_EXAM_APPDEV1
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Deploy Cloud Functions (REQUIRED FOR ADMIN)

```bash
cd functions
npm install
firebase deploy --only functions
```

**Important Functions Deployed**:

- `setAdminOnUserCreate` - Auto-sets admin on account creation
- `verifyAdminOnSignIn` - Verifies admin status on login
- `enforceRecipientOnCreate` - Manages report visibility

### 4. Run Development Server

```bash
npm start
```

### 5. Build for Production

```bash
npm run build
```

### 6. Deploy to Firebase Hosting (Optional)

```bash
firebase deploy --only hosting
```

---

## 🔧 Manual Admin Setup (If Needed)

If the admin account exists but doesn't have admin privileges:

### Option 1: Using Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: **mountain-sentinel**
3. Go to **Authentication** → **Users**
4. Find user: `jennyasas14@gmail.com`
5. Click on the user
6. Go to **Custom Claims** tab
7. Add claim: `{ "admin": true }`

### Option 2: Using Firebase CLI

```bash
# Install Firebase CLI if not installed
npm install -g firebase-tools

# Login to Firebase
firebase login

# Get user UID
firebase auth:export users.json --project mountain-sentinel
# Find jennyasas14@gmail.com UID in users.json

# Set admin claim using Node.js script
node scripts/set-admin.js <UID> true <path-to-service-account.json>
```

### Option 3: Using Cloud Functions Console

1. Go to Firebase Console → **Functions**
2. Find function: `verifyAdminOnSignIn`
3. Test function with empty payload `{}`
4. This will verify/restore admin status

---

## 📊 Data Persistence

All data is stored in Firebase and persists across deployments:

### Firestore Collections:

- **`users`** - User profiles and roles
- **`incidents`** - Citizen reports (pending and approved)
- **`alerts`** - Police-issued safety alerts
- **`config/adminExists`** - Admin marker document

### Firebase Storage:

- **`incident-photos/`** - User-uploaded incident images
- **`alert-photos/`** - Police-issued alert images

### Authentication:

- Email/Password accounts
- Google OAuth accounts
- All persist in Firebase Auth

---

## 🧪 Testing After Deployment

1. **Login as Admin**:
   - Email: `jennyasas14@gmail.com`
   - Password: `Rememberme14`
   - Should redirect to `/admin-dashboard`

2. **Verify Admin Functions**:
   - Can view all citizen reports
   - Can approve/reject reports
   - Can create police alerts visible to all users
   - Can access admin-only features

3. **Test Regular User**:
   - Create new account with different email
   - Should redirect to `/dashboard` (not admin-dashboard)
   - Can submit reports (only visible to admin until approved)

---

## 🔒 Security Rules

Firestore rules ensure:

- ✅ Admin can read/write all documents
- ✅ Users can only create reports marked `recipient: 'admin'`
- ✅ Only admin can approve reports (change recipient to 'users' or 'both')
- ✅ Primary admin account protected in Cloud Functions

---

## ⚠️ Important Notes

1. **Firebase Configuration** is in `src/app/app.config.ts` - already set up
2. **Cloud Functions** MUST be deployed for automatic admin setup
3. **Primary admin email** `jennyasas14@gmail.com` is hardcoded in `functions/index.js`
4. **All data persists** - reports, users, and images are stored in Firebase
5. **Multiple deployments safe** - Data remains in Firebase regardless of GitHub deployments

---

## 🐛 Troubleshooting

### Admin Login Not Working?

1. Check Cloud Functions are deployed: `firebase functions:list`
2. Verify Functions logs: `firebase functions:log`
3. Check Firestore user document has `role: 'admin'`
4. Try manual admin setup (see above)

### Reports Not Showing?

1. Check Firestore security rules are deployed
2. Verify Cloud Function `enforceRecipientOnCreate` is active
3. Check browser console for Firebase errors

### Cannot Deploy Functions?

```bash
# Ensure Firebase CLI is installed
npm install -g firebase-tools

# Login to correct account
firebase login

# Select correct project
firebase use mountain-sentinel

# Deploy
firebase deploy --only functions
```

---

## 📞 Support

For Firebase project access or issues:

- **Project ID**: `mountain-sentinel`
- **Admin Email**: jennyasas14@gmail.com
- **GitHub Repo**: https://github.com/jennyAsas/FINALS_EXAM_APPDEV1

---

**Status**: ✅ Ready for Deployment  
**Last Updated**: December 9, 2025
