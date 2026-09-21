const admin = require('firebase-admin');
require('dotenv').config({ path: '.env.local' });

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();

async function check() {
  console.log('\n═══════════════════════════════════════════');
  console.log('📊 HAFASH GALLERY STATUS CHECK');
  console.log('═══════════════════════════════════════════\n');

  const galleriesSnap = await db.collection('galleries').get();
  console.log(`📦 Total Galleries: ${galleriesSnap.size}\n`);

  for (const galleryDoc of galleriesSnap.docs) {
    const data = galleryDoc.data();
    const itemsArray = Array.isArray(data.items) ? data.items : [];

    // Count subcollection photos
    const photosSnap = await galleryDoc.ref.collection('photos').get();
    const subcollectionCount = photosSnap.size;

    console.log(`┌─────────────────────────────────────────────`);
    console.log(`│ 🎨 ${data.title || '(no title)'}`);
    console.log(`│ 📁 ID: ${galleryDoc.id}`);
    console.log(`├─────────────────────────────────────────────`);
    console.log(`│ 📄 items array (legacy):     ${itemsArray.length}`);
    console.log(`│ 📸 photos subcollection:     ${subcollectionCount}`);
    console.log(`│ 🔢 photoCount field:         ${data.photoCount || 'not set'}`);
    console.log(`│ ✅ Total accessible:          ${Math.max(subcollectionCount, itemsArray.length)}`);
    
    if (subcollectionCount > 0) {
      // Check first 3 photos
      const sample = photosSnap.docs.slice(0, 3);
      console.log(`│`);
      console.log(`│ Sample photos:`);
      sample.forEach((p, i) => {
        const pd = p.data();
        console.log(`│   ${i + 1}. ${pd.fileName || p.id}`);
        console.log(`│      has original: ${pd.originalReady ? '✅' : '❌'}`);
        console.log(`│      has thumb: ${pd.thumbUrl ? '✅' : '❌'}`);
        console.log(`│      order: ${pd.order || 'not set'}`);
      });
    }
    console.log(`└─────────────────────────────────────────────\n`);
  }

  console.log('═══════════════════════════════════════════');
  console.log('✅ CHECK COMPLETE');
  console.log('═══════════════════════════════════════════\n');
  process.exit(0);
}

check().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
