import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '10s', target: 20 }, // Ramp-up to 20 users
    { duration: '30s', target: 50 }, // Sustained load at 50 users
    { duration: '10s', target: 0 },  // Ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must complete within 500ms
    http_req_failed: ['rate<0.01'],    // Error rate must be less than 1%
  },
};

const BASE_URL = __ENV.TARGET_URL || 'http://localhost:3001';

export default function () {
  // 1. Health check & Public Admission Portal
  const resApp = http.get(`${BASE_URL}/apply`);
  check(resApp, {
    'Public admission page status is 200': (r) => r.status === 200,
  });

  sleep(1);

  // 2. High-volume student registration POST load
  const payload = JSON.stringify({
    studentName: `K6 Student ${Math.floor(Math.random() * 10000)}`,
    grade: 'Grade 1',
    birthDate: '2018-05-15',
    studentNationality: 'Saudi',
    parentName: 'Parent K6',
    phone: `+96650${Math.floor(1000000 + Math.random() * 9000000)}`,
    email: `k6_${Date.now()}@example.com`,
    address: 'Riyadh'
  });

  const params = {
    headers: { 'Content-Type': 'application/json' },
  };

  const resRegister = http.post(`${BASE_URL}/api/leads`, payload, params);
  check(resRegister, {
    'Student registration API status is 200': (r) => r.status === 200,
  });

  sleep(1);

  // 3. Webhook message ingestion simulation
  const webhookPayload = JSON.stringify({
    object: 'page',
    entry: [
      {
        id: 'entry_k6',
        messaging: [
          {
            sender: { id: `psid_${Math.floor(Math.random() * 50000)}` },
            recipient: { id: 'page_gmis' },
            message: { text: 'Inquiry about registration fees' }
          }
        ]
      }
    ]
  });

  const resWebhook = http.post(`${BASE_URL}/webhook`, webhookPayload, params);
  check(resWebhook, {
    'Webhook ingestion status is 200': (r) => r.status === 200,
  });

  sleep(1);
}
