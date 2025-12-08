const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

// Primary admin email - ALWAYS has admin privileges
const PRIMARY_ADMIN_EMAIL = 'jennyasas14@gmail.com';

/**
 * Automatically set admin custom claim for primary admin email
 * This runs whenever a new user is created in Firebase Auth
 */
exports.setAdminOnUserCreate = functions.auth.user().onCreate(async (user) => {
  try {
    if (user.email && user.email.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase()) {
      console.log(`Setting admin claim for primary admin: ${user.email}`);
      await admin.auth().setCustomUserClaims(user.uid, { admin: true });
      
      // Also create/update the user document in Firestore
      await admin.firestore().collection('users').doc(user.uid).set({
        email: user.email,
        role: 'admin',
        displayName: user.displayName || 'Admin',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        isPrimaryAdmin: true
      }, { merge: true });

      // Ensure adminExists marker is set
      await admin.firestore().collection('config').doc('adminExists').set({
        ownerUid: user.uid,
        email: user.email,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      console.log(`Primary admin setup completed for ${user.email}`);
    }
  } catch (err) {
    console.error('setAdminOnUserCreate error:', err);
  }
  return null;
});

/**
 * Ensure primary admin always maintains admin privileges
 * This runs on user sign-in to verify admin status
 */
exports.verifyAdminOnSignIn = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userEmail = context.auth.token.email;
    if (!userEmail) {
      throw new functions.https.HttpsError('invalid-argument', 'No email found');
    }

    // Check if this is the primary admin
    if (userEmail.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase()) {
      const currentClaims = context.auth.token;
      
      // If admin claim is missing, set it
      if (!currentClaims.admin) {
        console.log(`Restoring admin claim for primary admin: ${userEmail}`);
        await admin.auth().setCustomUserClaims(context.auth.uid, { admin: true });
        
        // Update Firestore document
        await admin.firestore().collection('users').doc(context.auth.uid).set({
          email: userEmail,
          role: 'admin',
          isPrimaryAdmin: true,
          lastVerified: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        return { success: true, message: 'Admin privileges restored', isAdmin: true };
      }

      return { success: true, message: 'Admin privileges verified', isAdmin: true };
    }

    // For non-primary users, just return their current admin status
    return { success: true, isAdmin: !!currentClaims.admin };
  } catch (err) {
    console.error('verifyAdminOnSignIn error:', err);
    throw new functions.https.HttpsError('internal', 'Failed to verify admin status');
  }
});

/**
 * When an incident is created, ensure recipient is set to 'admin' for regular users.
 * If the creator is an admin (custom claim), allow 'both' or 'users' as-is.
 */
exports.enforceRecipientOnCreate = functions.firestore
  .document('incidents/{incidentId}')
  .onCreate(async (snap, context) => {
    const data = snap.data();
    const createdByUid = data?.createdBy;

    try {
      if (!createdByUid) {
        // no creator — make admin only by default
        await snap.ref.update({ recipient: 'admin' });
        return null;
      }

      const userRecord = await admin.auth().getUser(createdByUid);
      const isAdmin = !!userRecord.customClaims && !!userRecord.customClaims.admin;

      if (isAdmin) {
        // leave recipient as provided (or default to both)
        if (!data.recipient) await snap.ref.update({ recipient: 'both' });
      } else {
        // Ensure it's admin-only so users won't see it until admin approves
        await snap.ref.update({ recipient: 'admin' });
      }
    } catch (err) {
      console.error('enforceRecipientOnCreate error:', err);
    }

    return null;
  });