const https = require('https');

function sendRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`https://store-29692-default-rtdb.firebaseio.com${path}`);
    const req = https.request(
      url,
      {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          resolve({ status: res.statusCode, data });
        });
      }
    );
    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function test() {
  console.log('Testing write to Firebase RTDB without auth...');
  const res1 = await sendRequest('PUT', '/products/test-item-1.json', {
    id: 'test-item-1',
    name: 'حذاء تجريبي',
    price: 15000,
  });
  console.log('Response status:', res1.status);
  console.log('Response body:', res1.data);
}

test();
