import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
export const errorRate = new Rate('errors');
export const catalogTrend = new Trend('catalog_duration');
export const searchTrend = new Trend('search_duration');

export const options = {
  stages: [
    { duration: '5s', target: 20 },  // Ramp-up to 20 VUs
    { duration: '15s', target: 50 }, // Sustained load at 50 VUs
    { duration: '5s', target: 0 },   // Ramp-down to 0 VUs
  ],
  thresholds: {
    'http_req_duration': ['p(95)<800'], // 95% of requests must complete under 800ms
    'errors': ['rate<0.05'],            // Error rate must be under 5%
  },
};

const BASE_URL = __ENV.API_URL || 'https://snapit-full-stack-production.up.railway.app';

export default function () {
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  };

  group('Category & Navigation API', () => {
    const res = http.get(`${BASE_URL}/api/category/get`, params);
    const pass = check(res, {
      'status is 200': (r) => r.status === 200,
      'category list returned': (r) => {
        try {
          const body = JSON.parse(r.body);
          return Array.isArray(body.data) && body.data.length > 0;
        } catch (e) {
          return false;
        }
      },
    });
    errorRate.add(!pass);
  });

  group('Product Catalog Pagination', () => {
    const payload = JSON.stringify({ page: 1, limit: 12 });
    const res = http.post(`${BASE_URL}/api/product/get`, payload, params);
    catalogTrend.add(res.timings.duration);
    const pass = check(res, {
      'catalog status 200': (r) => r.status === 200,
      'products array returned': (r) => {
        try {
          const body = JSON.parse(r.body);
          return Array.isArray(body.data);
        } catch (e) {
          return false;
        }
      },
    });
    errorRate.add(!pass);
  });

  group('Search Engine Load', () => {
    const searchTerms = ['milk', 'dal', 'coke', 'rice', 'shampoo'];
    const randomTerm = searchTerms[Math.floor(Math.random() * searchTerms.length)];
    const payload = JSON.stringify({ search: randomTerm, page: 1, limit: 10 });
    const res = http.post(`${BASE_URL}/api/product/search-product`, payload, params);
    searchTrend.add(res.timings.duration);
    const pass = check(res, {
      'search status 200': (r) => r.status === 200,
      'search completed': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.success === true || Array.isArray(body.data);
        } catch (e) {
          return false;
        }
      },
    });
    errorRate.add(!pass);
  });

  group('Smart Combos Engine', () => {
    const res = http.get(`${BASE_URL}/api/product/smart-combos`, params);
    const pass = check(res, {
      'combos status 200': (r) => r.status === 200,
    });
    errorRate.add(!pass);
  });

  group('Customer PIN Reset Guard', () => {
    // Test unauthenticated or missing data guard
    const payload = JSON.stringify({ identifier: 'test_nonexistent@example.com', newPin: '9999' });
    const res = http.post(`${BASE_URL}/api/user/admin-reset-pin`, payload, params);
    // Should be guarded by auth middleware (401 Unauthorized or 403 Forbidden without token)
    const pass = check(res, {
      'admin route securely blocked without token': (r) => r.status === 401 || r.status === 403 || r.status === 400,
    });
    errorRate.add(!pass);
  });

  sleep(0.5);
}
