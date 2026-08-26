import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, get } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyD4z7MljYOwlWc7eW27zBJsRt5pRD2JHfc",
  authDomain: "store-29692.firebaseapp.com",
  databaseURL: "https://store-29692-default-rtdb.firebaseio.com",
  projectId: "store-29692",
  storageBucket: "store-29692.firebasestorage.app",
  messagingSenderId: "708544997996",
  appId: "1:708544997996:web:913f4f694ae36bf397c649"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

async function diagnose() {
  console.log('--- 1. Testing Unauthenticated Write to orders/TEST1234 ---');
  const testOrder = {
    id: 'TEST1234',
    orderNo: 'IQ1234',
    name: 'زبون تجريبي',
    phone: '07701234567',
    total: 35000,
    createdAt: new Date().toISOString()
  };

  try {
    await set(ref(db, 'orders/TEST1234'), testOrder);
    console.log('✅ Unauthenticated Write to orders/TEST1234: SUCCESS');
  } catch (err) {
    console.error('❌ Unauthenticated Write to orders/TEST1234 FAILED:', err.message);
  }

  console.log('\n--- 2. Testing Unauthenticated Read from orders ---');
  try {
    const snap = await get(ref(db, 'orders'));
    console.log('✅ Unauthenticated Read from orders: SUCCESS! Val count:', Object.keys(snap.val() || {}).length);
    console.log('Orders keys:', Object.keys(snap.val() || {}));
  } catch (err) {
    console.error('❌ Unauthenticated Read from orders FAILED:', err.message);
  }
}

diagnose().then(() => process.exit(0)).catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
