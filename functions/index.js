// functions/index.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

// Assemble SOS archive (combine all chunks)
exports.assembleSOSArchive = functions.https.onCall(async (data, context) => {
  const { sessionId } = data;

  try {
    // Get all chunks
    const chunksSnapshot = await admin.firestore()
      .collection('sos-sessions')
      .doc(sessionId)
      .collection('chunks')
      .orderBy('index')
      .get();

    const chunks = [];
    chunksSnapshot.forEach(doc => {
      chunks.push(doc.data());
    });

    if (chunks.length === 0) {
      throw new Error('No chunks found for session');
    }

    // Create archive metadata
    const archiveRef = admin.firestore()
      .collection('sos-sessions')
      .doc(sessionId)
      .collection('archives')
      .doc('main');

    await archiveRef.set({
      totalChunks: chunks.length,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'ready',
      chunks: chunks.map(c => ({
        index: c.index,
        url: c.url,
        timestamp: c.timestamp,
      })),
    });

    // Update session with archive status
    await admin.firestore()
      .collection('sos-sessions')
      .doc(sessionId)
      .update({
        archiveReady: true,
        archiveTimestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

    return {
      success: true,
      totalChunks: chunks.length,
      archiveId: 'main',
    };
  } catch (error) {
    console.error('Error assembling archive:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Get SOS session details (for viewer)
exports.getSOSSession = functions.https.onCall(async (data, context) => {
  const { sessionId } = data;

  try {
    // Get session metadata
    const sessionDoc = await admin.firestore()
      .collection('sos-sessions')
      .doc(sessionId)
      .get();

    if (!sessionDoc.exists) {
      throw new Error('Session not found');
    }

    // Get all chunks
    const chunksSnapshot = await admin.firestore()
      .collection('sos-sessions')
      .doc(sessionId)
      .collection('chunks')
      .orderBy('index')
      .get();

    const chunks = [];
    chunksSnapshot.forEach(doc => {
      chunks.push(doc.data());
    });

    return {
      session: sessionDoc.data(),
      chunks,
    };
  } catch (error) {
    console.error('Error getting session:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Optional: Log when SOS sessions are created
 */
exports.onSOSSessionCreated = functions.firestore
  .document('sos-sessions/{sessionId}')
  .onCreate(async (snap, context) => {
    const sessionId = context.params.sessionId;
    const sessionData = snap.data();

    console.log(`New SOS session created: ${sessionId}`);
    console.log(`User: ${sessionData.username}`);
    console.log(`Status: ${sessionData.status}`);

    // You can add additional logic here, such as:
    // - Sending push notifications to emergency contacts
    // - Triggering additional alerts
    // - Logging to external monitoring systems

    return null;
  });

/**
 * Optional: Archive old completed SOS sessions after 90 days
 */
exports.archiveOldSOSSessions = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    try {
      const oldSessions = await admin.firestore()
        .collection('sos-sessions')
        .where('status', '==', 'completed')
        .where('endTime', '<', ninetyDaysAgo)
        .get();

      console.log(`Found ${oldSessions.size} old sessions to archive`);

      const archivePromises = oldSessions.docs.map(async (doc) => {
        return doc.ref.update({
          archived: true,
          archivedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      });

      await Promise.all(archivePromises);
      console.log('✅ Archive complete');
    } catch (error) {
      console.error('Archive error:', error);
    }

    return null;
  });