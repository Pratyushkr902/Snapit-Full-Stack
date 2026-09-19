import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metric rates
export const rbacPassRate = new Rate('rbac_checks_passed');
export const apiSuccessRate = new Rate('api_requests_successful');
export const apiLatency = new Trend('api_latency_ms');

// Test options
export const options = {
  scenarios: {
    role_security_and_load: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '10s', target: 10 }, // Ramp up to 10 VUs
        { duration: '20s', target: 10 }, // Hold load
        { duration: '5s', target: 0 },   // Ramp down
      ],
      gracefulRampDown: '5s',
    },
  },
  thresholds: {
    'rbac_checks_passed': ['rate>=0.99'], // 99%+ of all role enforcement checks must strictly pass
    'api_latency_ms': ['p(95)<3000'],     // 95% of calls respond within 3s
  },
};

// Load generated role tokens
let tokensData;
try {
  tokensData = JSON.parse(open('./tokens.json'));
} catch (e) {
  tokensData = { tokens: {}, userInfo: {} };
}

const BASE_URL = __ENV.TARGET_URL || 'https://snapit-full-stack-production.up.railway.app';

function authHeader(token) {
  return {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  };
}

const jsonHeader = {
  headers: {
    'Content-Type': 'application/json',
  },
};

export default function () {
  const tokens = tokensData.tokens || {};

  // ───────────────────────────────────────────────────────────────────────────
  // 1. PUBLIC / UNAUTHENTICATED TESTS
  // ───────────────────────────────────────────────────────────────────────────
  group('1. Public & Unauthenticated Access', () => {
    // Health check
    let res = http.get(`${BASE_URL}/health`);
    let pass = check(res, {
      'health returns 200': (r) => r.status === 200,
    });
    apiSuccessRate.add(pass);
    apiLatency.add(res.timings.duration);

    // Store status (publicly readable)
    res = http.get(`${BASE_URL}/api/admin/store-status`);
    pass = check(res, {
      'store-status returns 200': (r) => r.status === 200,
    });
    apiSuccessRate.add(pass);

    // Product search (public)
    res = http.post(`${BASE_URL}/api/product/search-product`, JSON.stringify({ search: 'milk' }), jsonHeader);
    pass = check(res, {
      'public search returns 200': (r) => r.status === 200,
    });
    apiSuccessRate.add(pass);

    // RBAC: Unauthenticated call to protected order list -> MUST return 401
    res = http.get(`${BASE_URL}/api/order/order-list`);
    pass = check(res, {
      'unauthenticated order-list blocked with 401': (r) => r.status === 401,
    });
    rbacPassRate.add(pass);

    // RBAC: Unauthenticated call to wallet pay -> MUST return 401
    res = http.post(`${BASE_URL}/api/wallet/pay`, JSON.stringify({ amount: 10 }), jsonHeader);
    pass = check(res, {
      'unauthenticated wallet pay blocked with 401': (r) => r.status === 401,
    });
    rbacPassRate.add(pass);

    // RBAC: Unauthenticated call to admin daily accounts -> MUST return 401
    res = http.get(`${BASE_URL}/api/daily-account`);
    pass = check(res, {
      'unauthenticated daily-account blocked with 401': (r) => r.status === 401,
    });
    rbacPassRate.add(pass);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. CUSTOMER (USER) ROLE TESTS
  // ───────────────────────────────────────────────────────────────────────────
  if (tokens.USER) {
    const userHeaders = authHeader(tokens.USER);

    group('2. Customer Role Authorization & Boundaries', () => {
      // Allowed: Get profile details
      let res = http.get(`${BASE_URL}/api/user/user-details`, userHeaders);
      let pass = check(res, {
        'customer user-details returns 200': (r) => r.status === 200,
      });
      apiSuccessRate.add(pass);
      apiLatency.add(res.timings.duration);

      // Allowed: Get wallet
      res = http.get(`${BASE_URL}/api/wallet/get`, userHeaders);
      pass = check(res, {
        'customer wallet get returns 200': (r) => r.status === 200,
      });
      apiSuccessRate.add(pass);

      // Allowed: Get cart
      res = http.get(`${BASE_URL}/api/cart/get`, userHeaders);
      pass = check(res, {
        'customer cart get returns 200': (r) => r.status === 200,
      });
      apiSuccessRate.add(pass);

      // RBAC BLOCKED: Customer attempting to toggle rider duty -> MUST return 403
      res = http.post(`${BASE_URL}/api/rider-duty/toggle`, JSON.stringify({ status: true }), userHeaders);
      pass = check(res, {
        'customer rider-duty/toggle blocked with 403': (r) => r.status === 403,
      });
      rbacPassRate.add(pass);

      // RBAC BLOCKED: Customer attempting to post rider location -> MUST return 403
      res = http.post(`${BASE_URL}/api/rider-duty/location`, JSON.stringify({ latitude: 25.33, longitude: 84.80 }), userHeaders);
      pass = check(res, {
        'customer rider-duty/location blocked with 403': (r) => r.status === 403,
      });
      rbacPassRate.add(pass);

      // RBAC BLOCKED: Customer attempting to mark order delivered -> MUST return 403
      res = http.post(`${BASE_URL}/api/delivery/mark-delivered`, JSON.stringify({ orderId: '60c72b2f9b1d8b2bad000000', photo: 'data:image/png;base64,fake' }), userHeaders);
      pass = check(res, {
        'customer mark-delivered blocked with 403': (r) => r.status === 403,
      });
      rbacPassRate.add(pass);

      // RBAC BLOCKED: Customer attempting to access unauthorized delivery proof (IDOR Guard) -> MUST return 403 or 404
      res = http.get(`${BASE_URL}/api/delivery/proof/60c72b2f9b1d8b2bad000000`, userHeaders);
      pass = check(res, {
        'customer unauthorized delivery proof blocked with 403/404': (r) => r.status === 403 || r.status === 404,
      });
      rbacPassRate.add(pass);

      // RBAC BLOCKED: Customer attempting to submit rider remittance -> MUST return 403
      res = http.post(`${BASE_URL}/api/rider-remittance/submit`, JSON.stringify({ amount: 500 }), userHeaders);
      pass = check(res, {
        'customer remittance submit blocked with 403': (r) => r.status === 403,
      });
      rbacPassRate.add(pass);

      // RBAC BLOCKED: Customer attempting to access seller orders -> MUST return 403
      res = http.get(`${BASE_URL}/api/order/seller-orders`, userHeaders);
      pass = check(res, {
        'customer seller-orders blocked with 403': (r) => r.status === 403,
      });
      rbacPassRate.add(pass);

      // RBAC BLOCKED: Customer attempting to access admin daily sales report -> MUST return 403
      res = http.get(`${BASE_URL}/api/order/daily-report`, userHeaders);
      pass = check(res, {
        'customer admin daily-report blocked with 403': (r) => r.status === 403,
      });
      rbacPassRate.add(pass);

      // RBAC BLOCKED: Customer attempting to access super admin management -> MUST return 403
      res = http.get(`${BASE_URL}/api/adminManagement/list`, userHeaders);
      pass = check(res, {
        'customer adminManagement/list blocked with 403': (r) => r.status === 403,
      });
      rbacPassRate.add(pass);

      // RBAC BLOCKED: Customer attempting to view admin treasury summary -> MUST return 403
      res = http.get(`${BASE_URL}/api/treasury/summary`, userHeaders);
      pass = check(res, {
        'customer treasury/summary blocked with 403': (r) => r.status === 403,
      });
      rbacPassRate.add(pass);
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 3. DELIVERY RIDER (RIDER) ROLE TESTS
  // ───────────────────────────────────────────────────────────────────────────
  if (tokens.RIDER) {
    const riderHeaders = authHeader(tokens.RIDER);

    group('3. Delivery Rider Role Authorization & Boundaries', () => {
      // Allowed: Rider duty status
      let res = http.get(`${BASE_URL}/api/rider-duty/status`, riderHeaders);
      let pass = check(res, {
        'rider duty status returns 200': (r) => r.status === 200,
      });
      apiSuccessRate.add(pass);
      apiLatency.add(res.timings.duration);

      // Allowed: Rider remittance history
      res = http.get(`${BASE_URL}/api/rider-remittance/my-history`, riderHeaders);
      pass = check(res, {
        'rider remittance history returns 200': (r) => r.status === 200,
      });
      apiSuccessRate.add(pass);

      // Allowed: Rider fleet order items
      res = http.get(`${BASE_URL}/api/order/order-items`, riderHeaders);
      pass = check(res, {
        'rider order-items returns 200': (r) => r.status === 200,
      });
      apiSuccessRate.add(pass);

      // RBAC BLOCKED: Rider attempting admin daily report -> MUST return 403
      res = http.get(`${BASE_URL}/api/order/daily-report`, riderHeaders);
      pass = check(res, {
        'rider admin daily-report blocked with 403': (r) => r.status === 403,
      });
      rbacPassRate.add(pass);

      // RBAC BLOCKED: Rider attempting admin restaurant orders -> MUST return 403
      res = http.get(`${BASE_URL}/api/order/admin/restaurant-orders`, riderHeaders);
      pass = check(res, {
        'rider restaurant-orders blocked with 403': (r) => r.status === 403,
      });
      rbacPassRate.add(pass);

      // RBAC BLOCKED: Rider attempting admin management -> MUST return 403
      res = http.get(`${BASE_URL}/api/adminManagement/list`, riderHeaders);
      pass = check(res, {
        'rider adminManagement/list blocked with 403': (r) => r.status === 403,
      });
      rbacPassRate.add(pass);

      // RBAC BLOCKED: Rider attempting treasury access -> MUST return 403
      res = http.get(`${BASE_URL}/api/treasury/summary`, riderHeaders);
      pass = check(res, {
        'rider treasury/summary blocked with 403': (r) => r.status === 403,
      });
      rbacPassRate.add(pass);
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 4. MERCHANT / SELLER (SELLER) ROLE TESTS
  // ───────────────────────────────────────────────────────────────────────────
  if (tokens.SELLER) {
    const sellerHeaders = authHeader(tokens.SELLER);

    group('4. Merchant / Seller Role Authorization & Boundaries', () => {
      // Allowed: Seller orders
      let res = http.get(`${BASE_URL}/api/order/seller-orders`, sellerHeaders);
      let pass = check(res, {
        'seller orders returns 200': (r) => r.status === 200,
      });
      apiSuccessRate.add(pass);
      apiLatency.add(res.timings.duration);

      // Allowed: Seller earnings
      res = http.get(`${BASE_URL}/api/order/seller-earnings`, sellerHeaders);
      pass = check(res, {
        'seller earnings returns 200': (r) => r.status === 200,
      });
      apiSuccessRate.add(pass);

      // RBAC BLOCKED: Seller attempting rider duty toggle -> MUST return 403
      res = http.post(`${BASE_URL}/api/rider-duty/toggle`, JSON.stringify({ status: true }), sellerHeaders);
      pass = check(res, {
        'seller rider-duty/toggle blocked with 403': (r) => r.status === 403,
      });
      rbacPassRate.add(pass);

      // RBAC BLOCKED: Seller attempting rider location update -> MUST return 403
      res = http.post(`${BASE_URL}/api/rider-duty/location`, JSON.stringify({ latitude: 25.33, longitude: 84.80 }), sellerHeaders);
      pass = check(res, {
        'seller rider-duty/location blocked with 403': (r) => r.status === 403,
      });
      rbacPassRate.add(pass);

      // RBAC BLOCKED: Seller attempting mark-delivered -> MUST return 403
      res = http.post(`${BASE_URL}/api/delivery/mark-delivered`, JSON.stringify({ orderId: '60c72b2f9b1d8b2bad000000', photo: 'fake' }), sellerHeaders);
      pass = check(res, {
        'seller mark-delivered blocked with 403': (r) => r.status === 403,
      });
      rbacPassRate.add(pass);

      // RBAC BLOCKED: Seller attempting treasury access -> MUST return 403
      res = http.get(`${BASE_URL}/api/treasury/summary`, sellerHeaders);
      pass = check(res, {
        'seller treasury/summary blocked with 403': (r) => r.status === 403,
      });
      rbacPassRate.add(pass);

      // RBAC BLOCKED: Seller attempting super admin management -> MUST return 403
      res = http.get(`${BASE_URL}/api/adminManagement/list`, sellerHeaders);
      pass = check(res, {
        'seller adminManagement/list blocked with 403': (r) => r.status === 403,
      });
      rbacPassRate.add(pass);
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 5. ADMIN ROLE TESTS
  // ───────────────────────────────────────────────────────────────────────────
  if (tokens.ADMIN) {
    const adminHeaders = authHeader(tokens.ADMIN);

    group('5. Administrator Role Authorization & Boundaries', () => {
      // Allowed: Daily Accounts
      let res = http.get(`${BASE_URL}/api/daily-account`, adminHeaders);
      let pass = check(res, {
        'admin daily-account returns 200': (r) => r.status === 200,
      });
      apiSuccessRate.add(pass);
      apiLatency.add(res.timings.duration);

      // Allowed: Treasury summary
      res = http.get(`${BASE_URL}/api/treasury/summary`, adminHeaders);
      pass = check(res, {
        'admin treasury/summary returns 200': (r) => r.status === 200,
      });
      apiSuccessRate.add(pass);

      // Allowed: Daily Sales Report
      res = http.get(`${BASE_URL}/api/order/daily-report`, adminHeaders);
      pass = check(res, {
        'admin daily-report returns 200': (r) => r.status === 200,
      });
      apiSuccessRate.add(pass);

      // Allowed: All Refunds List
      res = http.get(`${BASE_URL}/api/refund/all`, adminHeaders);
      pass = check(res, {
        'admin refund/all returns 200': (r) => r.status === 200,
      });
      apiSuccessRate.add(pass);

      // Allowed: Live fleet status
      res = http.get(`${BASE_URL}/api/rider-duty/admin/live-fleet`, adminHeaders);
      pass = check(res, {
        'admin live-fleet returns 200': (r) => r.status === 200,
      });
      apiSuccessRate.add(pass);

      // RBAC BLOCKED: Standard Admin attempting SUPER_ADMIN-only action (create admin) -> MUST return 403
      res = http.post(`${BASE_URL}/api/adminManagement/create`, JSON.stringify({ email: 'fake@admin.com', name: 'Fake' }), adminHeaders);
      pass = check(res, {
        'admin creating admin blocked with 403 (SUPER_ADMIN only)': (r) => r.status === 403,
      });
      rbacPassRate.add(pass);
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 6. SUPER ADMIN ROLE TESTS
  // ───────────────────────────────────────────────────────────────────────────
  if (tokens.SUPER_ADMIN) {
    const superAdminHeaders = authHeader(tokens.SUPER_ADMIN);

    group('6. Super Admin Role Authorization & Full Privileges', () => {
      // Allowed: Super Admin management list
      let res = http.get(`${BASE_URL}/api/adminManagement/list`, superAdminHeaders);
      let pass = check(res, {
        'superAdmin adminManagement/list returns 200': (r) => r.status === 200,
      });
      apiSuccessRate.add(pass);
      apiLatency.add(res.timings.duration);

      // Allowed: Treasury summary
      res = http.get(`${BASE_URL}/api/treasury/summary`, superAdminHeaders);
      pass = check(res, {
        'superAdmin treasury/summary returns 200': (r) => r.status === 200,
      });
      apiSuccessRate.add(pass);

      // Allowed: Daily accounts
      res = http.get(`${BASE_URL}/api/daily-account`, superAdminHeaders);
      pass = check(res, {
        'superAdmin daily-account returns 200': (r) => r.status === 200,
      });
      apiSuccessRate.add(pass);
    });
  }

  sleep(0.5);
}
