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