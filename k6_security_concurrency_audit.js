import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

const errorRate = new Rate('errors');
const throughputTrend = new Trend('request_duration_ms');
const raceDefendedCounter = new Counter('race_attacks_defended');

const BASE_URL = __ENV.API_URL || 'https://snapit-full-stack-production.up.railway.app';

export const options = {
    scenarios: {
        // Scenario 1: Hyperlocal Catalog & Search Concurrency
        hyperlocal_catalog_load: {
            executor: 'ramping-vus',
            startVUs: 2,
            stages: [
                { duration: '10s', target: 20 }, // Fast ramp to 20 concurrent shoppers
                { duration: '20s', target: 20 }, // Sustained load
                { duration: '5s',  target: 0 },  // Ramp down
            ],
            gracefulRampDown: '5s',
            exec: 'catalogLoadTest',
        },
        // Scenario 2: Security & Tampering Resistance Checks
        security_and_loopholes: {
            executor: 'per-vu-iterations',
            vus: 1,
            iterations: 1,
            startTime: '5s',
            exec: 'securityAuditTest',
        },
    },
    thresholds: {
        http_req_failed: ['rate<0.02'],     // Less than 2% HTTP errors
        http_req_duration: ['p(95)<1500'],  // 95% of responses under 1.5s
        errors: ['rate<0.02'],
    },
};

const jsonHeaders = { 'Content-Type': 'application/json' };

// ── SETUP: Authenticate test user ───────────────────────────────────────────
export function setup() {
    console.log(`\n🛡️  Starting k6 Concurrency & Security Loophole Audit on: ${BASE_URL}`);

    const res = http.post(`${BASE_URL}/api/user/login`, JSON.stringify({
        email: 'test_customer@snapit.com',
        password: 'Test@12345',
    }), { headers: jsonHeaders });

    let token = null;
    let userId = null;
    if (res.status === 200) {
        const body = JSON.parse(res.body);
        token = body.data?.accesstoken;
        userId = body.data?._id;
        console.log(`  ✅ Auth OK for test customer (${userId})`);
    } else {
        console.warn(`  ⚠️ Auth failed (${res.status}), proceeding with public endpoints`);
    }

    return { token, userId };
}

// ── SCENARIO 1: Catalog, Restaurant & Search Concurrency ────────────────────
export function catalogLoadTest() {
    group('Catalog & Search Concurrency', function () {
        // 1. Categories
        const catRes = http.get(`${BASE_URL}/api/category/get`);
        const catOk = check(catRes, {
            'GET /api/category/get -> 200': (r) => r.status === 200,
            'Categories list valid': (r) => {
                try { return JSON.parse(r.body).data.length > 0; } catch { return false; }
            },
        });
        errorRate.add(!catOk);
        throughputTrend.add(catRes.timings.duration);

        // 2. Restaurants (Food Delivery)
        const restoRes = http.get(`${BASE_URL}/api/restaurant/all`);
        const restoOk = check(restoRes, {
            'GET /api/restaurant/all -> 200': (r) => r.status === 200,
            'Restaurants returned successfully': (r) => {
                try { return JSON.parse(r.body).data.length >= 10; } catch { return false; }
            },
        });
        errorRate.add(!restoOk);
        throughputTrend.add(restoRes.timings.duration);

        // 3. Product Search with concurrency
        const searchTerms = ['milk', 'bread', 'cake', 'biscuit', 'oil'];
        const term = searchTerms[Math.floor(Math.random() * searchTerms.length)];
        const searchRes = http.post(
            `${BASE_URL}/api/product/search-product`,
            JSON.stringify({ search: term, page: 1, limit: 10 }),
            { headers: jsonHeaders }
        );
        const searchOk = check(searchRes, {
            'POST /api/product/search-product -> 200': (r) => r.status === 200,
        });
        errorRate.add(!searchOk);
        throughputTrend.add(searchRes.timings.duration);

        sleep(0.5);
    });
}

// ── SCENARIO 2: Security & Loophole Verification ────────────────────────────
export function securityAuditTest(data) {
    const { token } = data;
    if (!token) {
        console.warn('Skipping authenticated security tests (no token).');
        return;
    }

    const authHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
    };

    group('Loophole 1: Negative Tip Tampering Defense', function () {
        const payload = JSON.stringify({
            items: [{ menuItemId: '6a396417e0dd57acb747e409', quantity: 1, price: 100 }],
            addressId: '6aa1bb6bf1ba0e843f64a8db',
            tip: -100, // Malicious negative tip attempt
            deliveryLocation: { lat: 25.3312, lng: 84.8006 },
        });

        const res = http.post(`${BASE_URL}/api/restaurant/food-order/cash-on-delivery`, payload, {
            headers: authHeaders,
        });

        // The server should either reject the order or sanitize tip to >= 0
        const body = res.body ? JSON.parse(res.body) : {};
        const tipSanitized = check(res, {
            'Negative tip handled safely (not subtracted from total)': () => {
                if (res.status === 400) return true; // Rejected
                if (res.status === 200) {
                    // Check order tip stored is 0, not -100
                    const order = body.data?.[0];
                    return (order?.tip || 0) >= 0;
                }
                return false;
            },
        });
        if (tipSanitized) raceDefendedCounter.add(1);
    });

    group('Loophole 2: Out-of-Range Distance Protection', function () {
        const payload = JSON.stringify({
            items: [{ menuItemId: '6a396417e0dd57acb747e409', quantity: 1, price: 100 }],
            addressId: '6aa1bb6bf1ba0e843f64a8db',
            deliveryLocation: { lat: 28.6139, lng: 77.2090 }, // New Delhi (1000km away from Paliganj!)
        });

        const res = http.post(`${BASE_URL}/api/restaurant/food-order/cash-on-delivery`, payload, {
            headers: authHeaders,
        });

        const outOfRangeDefended = check(res, {
            'Out-of-range delivery (>16km) rejected with 400': (r) => r.status === 400,
        });
        if (outOfRangeDefended) raceDefendedCounter.add(1);
    });

    group('Loophole 3: Wallet Double-Spending Race Protection', function () {
        // Attempt an order with ₹99999 wallet deduction when user has 0 balance
        const payload = JSON.stringify({
            items: [{ menuItemId: '6a396417e0dd57acb747e409', quantity: 1, price: 100 }],
            addressId: '6aa1bb6bf1ba0e843f64a8db',
            walletAmountUsed: 99999,
            deliveryLocation: { lat: 25.3312, lng: 84.8006 },
        });

        const res = http.post(`${BASE_URL}/api/restaurant/food-order/wallet`, payload, {
            headers: authHeaders,
        });

        const walletDefended = check(res, {
            'Excessive/Unbacked wallet deduction rejected with 400': (r) => r.status === 400,
        });
        if (walletDefended) raceDefendedCounter.add(1);
    });
}

// ── TEARDOWN ────────────────────────────────────────────────────────────────
export function teardown() {
    console.log('\n🏁 k6 Audit Suite Finished.');
}

