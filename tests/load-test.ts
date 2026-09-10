// tests/load-test.ts
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metric to track successful checkouts
const successRate = new Rate('successful_checkouts');

export const options = {
  // Simulate a flash sale traffic spike: 
  // Ramping up to 50 concurrent virtual users trying to book seats simultaneously
  stages: [
    { duration: '5s', target: 50 },
    { duration: '10s', target: 50 },
    { duration: '5s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must complete below 500ms
  },
};

const BASE_URL = 'http://localhost:3000/api/v1/checkout';

export default function () {
  // NOTE: Replace these with a real eventId and seatId from your seeded MongoDB
  const eventId = '6aa2e17d1b9bc6ab6606b33e';
  const seatId = '6aa2e17e1b9bc6ab6606b340';

  const payload = JSON.stringify({
    eventId: eventId,
    seatIds: [seatId],
    userEmail: `user-${__VU}-${__ITER}@example.com`,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': `k6-test-${__VU}-${__ITER}`,
    },
  };

  const res = http.post(`${-1 ? BASE_URL : BASE_URL}/hold`, payload, params); // Clean URL below

  // Actual request
  const response = http.post(`${BASE_URL}/hold`, payload, params);

  const isSuccess = response.status === 200;
  successRate.add(isSuccess);

  check(response, {
    'is status 200 or 409 (conflict)': (r) => r.status === 200 || r.status === 409,
  });

  sleep(0.1);
}