const https = require('https');

const apiKey = 'AIzaSyD4z7MljYOwlWc7eW27zBJsRt5pRD2JHfc';

function authWithEmail(email, password) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      email,
      password,
      returnSecureToken: true,
    });

    const req = https.request(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      },
      (res) => {
        let body = '';
        res.on('data', (d) => (body += d));
        res.on('end', () => {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        });
      }
    );
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function testAnonymousAuth() {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      returnSecureToken: true,
    });

    const req = https.request(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      },
      (res) => {
        let body = '';
        res.on('data', (d) => (body += d));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(body) });
          } catch (e) {
            resolve({ status: res.statusCode, data: body });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function run() {
  console.log('Testing Anonymous Auth on Firebase project store-29692...');
  const anon = await testAnonymousAuth();
  console.log('Anonymous auth response:', anon.status, anon.data.idToken ? 'ID TOKEN GENERATED!' : anon.data);

  if (anon.data && anon.data.idToken) {
    const token = anon.data.idToken;
    console.log('\nTesting write to RTDB with idToken...');
    const testWriteReq = https.request(
      `https://store-29692-default-rtdb.firebaseio.com/products/test-token-item.json?auth=${token}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
      },
      (res) => {
        let body = '';
        res.on('data', (d) => (body += d));
        res.on('end', () => {
          console.log('RTDB write with token response:', res.statusCode, body);
        });
      }
    );
    testWriteReq.write(JSON.stringify({ id: 'test-token-item', name: 'Test with Token', price: 99000 }));
    testWriteReq.end();
  }
}

run();
