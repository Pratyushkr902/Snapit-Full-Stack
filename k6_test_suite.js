import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const publicCatalogDuration = new Trend('public_catalog_duration');
const customerJourneyDuration = new Trend('customer_journey_duration');
const staffJourneyDuration = new Trend('staff_journey_duration');

const BASE_URL = __ENV.API_URL || 'https://snapit-full-stack-production.up.railway.app';

export const options = {
    scenarios: {
        hyperlocal_traffic: {
            executor: 'ramping-vus',
            startVUs: 1,
            stages: [
                { duration: '5s', target: 5 },   // Ramp up
                { duration: '15s', target: 10 }, // Sustained realistic load
                { duration: '5s', target: 0 },   // Ramp down
            ],
            gracefulRampDown: '5s',
        },
    },
    thresholds: {
        http_req_failed: ['rate<0.05'],     // Under 5% HTTP errors
        http_req_duration: ['p(95)<2500'],  // 95% of requests under 2.5s
        errors: ['rate<0.05'],
    },
};

// ── SETUP: Authenticate all 4 test users once ───────────────────────────────
export function setup() {
    console.log(`🚀 Setting up k6 Test Suite on: ${BASE_URL}`);

    const credentials = {
        customer: { email: 'test_customer@snapit.com', password: 'Test@12345' },
        rider:    { email: 'test_rider@snapit.com',    password: 'Test@12345' },
        seller:   { email: 'test_seller@snapit.com',   password: 'Test@12345' },
        admin:    { email: 'test_admin@snapit.com',    password: 'Test@12345' },
    };

    const auth = {};

    for (const [role, creds] of Object.entries(credentials)) {
        const res = http.post(`${BASE_URL}/api/user/login`, JSON.stringify(creds), {
            headers: { 'Content-Type': 'application/json' },
        });

        if (res.status === 200) {
            const body = JSON.parse(res.body);
            auth[role] = body.data?.accesstoken;
            console.log(`  ✅ [Auth Success] Role: ${role.toUpperCase()} (${creds.email})`);
        } else {
            console.error(`  ❌ [Auth Fail] Role: ${role} status: ${res.status}`);
        }
    }

    return { auth };
}

// ── VIRTUAL USER EXECUTION ──────────────────────────────────────────────────
export default function (data) {
    const { auth } = data;
    const jsonHeader = { 'Content-Type': 'application/json' };

    // ────────────────────────────────────────────────────────────────────────
    // 1. PUBLIC HOMEPAGE & CATALOG BROWSING
    // ────────────────────────────────────────────────────────────────────────
    group('1. Public Homepage & Catalog Discovery', function () {
        const start = Date.now();

        // 1a. Categories
        const catRes = http.get(`${BASE_URL}/api/category/get`);
        const catOk = check(catRes, {
            'GET /api/category/get -> 200': (r) => r.status === 200,
            'Categories list is non-empty': (r) => {
                try { return JSON.parse(r.body).data.length > 0; } catch { return false; }
            },
        });
        errorRate.add(!catOk);

        // 1b. Subcategories
        const subRes = http.get(`${BASE_URL}/api/subcategory/get`);
        const subOk = check(subRes, {
            'GET /api/subcategory/get -> 200': (r) => r.status === 200,
        });
        errorRate.add(!subOk);

        // 1c. Restaurants (Food Delivery)
        const restoRes = http.get(`${BASE_URL}/api/restaurant/all`);
        const restoOk = check(restoRes, {
            'GET /api/restaurant/all -> 200': (r) => r.status === 200,
        });
        errorRate.add(!restoOk);

        // 1d. Festive Banner Offers
        const bannerRes = http.get(`${BASE_URL}/api/festive-offer/current`);
        const bannerOk = check(bannerRes, {
            'GET /api/festive-offer/current -> 200': (r) => r.status === 200,
        });
        errorRate.add(!bannerOk);

        // 1e. Product Search
        const searchPayload = JSON.stringify({ search: 'milk', page: 1, limit: 10 });
        const searchRes = http.post(`${BASE_URL}/api/product/search-product`, searchPayload, { headers: jsonHeader });
        const searchOk = check(searchRes, {
            'POST /api/product/search-product -> 200': (r) => r.status === 200,
        });
        errorRate.add(!searchOk);

        publicCatalogDuration.add(Date.now() - start);
    });

    sleep(0.3);

    // ────────────────────────────────────────────────────────────────────────
    // 2. CUSTOMER USER JOURNEY
    // ────────────────────────────────────────────────────────────────────────
    if (auth.customer) {
        group('2. Customer Account & Wallet Journey', function () {
            const start = Date.now();
            const customerHeaders = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${auth.customer}`,
            };

            // 2a. Profile Details
            const profileRes = http.get(`${BASE_URL}/api/user/user-details`, { headers: customerHeaders });
            const profileOk = check(profileRes, {
                'GET /api/user/user-details -> 200': (r) => r.status === 200,
                'Customer email is test_customer@snapit.com': (r) => {
                    try { return JSON.parse(r.body).data?.email === 'test_customer@snapit.com'; } catch { return false; }
                },
            });
            errorRate.add(!profileOk);

            // 2b. Wallet
            const walletRes = http.get(`${BASE_URL}/api/wallet/get`, { headers: customerHeaders });
            const walletOk = check(walletRes, {
                'GET /api/wallet/get -> 200': (r) => r.status === 200,
                'Customer wallet has numeric balance': (r) => {
                    try { return typeof JSON.parse(r.body).data?.balance === 'number'; } catch { return false; }
                },
            });
            errorRate.add(!walletOk);

            // 2c. Addresses
            const addressRes = http.get(`${BASE_URL}/api/address/get`, { headers: customerHeaders });
            const addressOk = check(addressRes, {
                'GET /api/address/get -> 200': (r) => r.status === 200,
            });
            errorRate.add(!addressOk);

            // 2d. Order History
            const ordersRes = http.get(`${BASE_URL}/api/order/order-list`, { headers: customerHeaders });
            const ordersOk = check(ordersRes, {
                'GET /api/order/order-list -> 200': (r) => r.status === 200,
            });
            errorRate.add(!ordersOk);

            customerJourneyDuration.add(Date.now() - start);
        });
    }

    sleep(0.3);

    // ────────────────────────────────────────────────────────────────────────
    // 3. STAFF & OPERATIONAL JOURNEYS (Rider, Seller, Admin)
    // ────────────────────────────────────────────────────────────────────────
    group('3. Operational Staff Journeys (Rider, Seller, Admin)', function () {
        const start = Date.now();

        // 3a. Rider Duty Status
        if (auth.rider) {
            const riderHeaders = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${auth.rider}`,
            };
            const dutyRes = http.get(`${BASE_URL}/api/rider-duty/status`, { headers: riderHeaders });
            const dutyOk = check(dutyRes, {
                'Rider GET /api/rider-duty/status -> 200/400': (r) => r.status === 200 || r.status === 400,
            });
            errorRate.add(!dutyOk);
        }

        // 3b. Seller Orders
        if (auth.seller) {
            const sellerHeaders = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${auth.seller}`,
            };
            const sellerRes = http.get(`${BASE_URL}/api/order/seller-orders`, { headers: sellerHeaders });
            const sellerOk = check(sellerRes, {
                'Seller GET /api/order/seller-orders -> 200': (r) => r.status === 200,
            });
            errorRate.add(!sellerOk);
        }

        // 3c. Admin Fleet & Financial Overview
        if (auth.admin) {
            const adminHeaders = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${auth.admin}`,
            };

            // Admin: All Registered Riders
            const fleetRes = http.get(`${BASE_URL}/api/user/all-riders`, { headers: adminHeaders });
            const fleetOk = check(fleetRes, {
                'Admin GET /api/user/all-riders -> 200': (r) => r.status === 200,
            });
            errorRate.add(!fleetOk);

            // Admin: Live Fleet GPS
            const liveRes = http.get(`${BASE_URL}/api/rider-duty/admin/live-fleet`, { headers: adminHeaders });
            const liveOk = check(liveRes, {
                'Admin GET /api/rider-duty/admin/live-fleet -> 200': (r) => r.status === 200,
            });
            errorRate.add(!liveOk);

            // Admin: Daily Sales Report
            const reportRes = http.get(`${BASE_URL}/api/order/daily-report`, { headers: adminHeaders });
            const reportOk = check(reportRes, {
                'Admin GET /api/order/daily-report -> 200': (r) => r.status === 200,
            });
            errorRate.add(!reportOk);
        }

        staffJourneyDuration.add(Date.now() - start);
    });

    sleep(0.3);
}

// ── TEARDOWN ────────────────────────────────────────────────────────────────
export function teardown() {
    console.log('🏁 All test workflows completed successfully.');
}
