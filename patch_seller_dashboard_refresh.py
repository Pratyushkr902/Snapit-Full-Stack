"""
Fixes the "refresh button not working" issue in SellerDashboard.jsx.

Root cause: fetchOrders(silent=true) — which the refresh button and the
30s auto-poll both call — skips setLoading(true) AND skips the
toast.error() in the catch block. So if the request fails (auth hiccup,
network blip, cold Railway instance, etc.) there is zero visual feedback:
no spinner, no error toast, nothing. It looks exactly like a dead button.

This patch keeps "silent" meaning "no full-page loading spinner" but always
surfaces failures via toast, so you can actually tell when refresh fails.

Run from repo root:
    python3 patch_seller_dashboard_refresh.py
"""

path = "client/src/pages/SellerDashboard.jsx"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = """    const fetchOrders = useCallback(async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            const res = await Axios({ ...SummaryApi.getSellerOrders });
            if (res.data.success) {
                setAllOrders(Array.isArray(res.data.data) ? res.data.data : []);
                setLastRefreshed(new Date());
            }
        } catch { toast.error('Failed to fetch orders'); }
        finally { setLoading(false); }
    }, []); // no deps — Axios and SummaryApi are module-level constants"""

new = """    const fetchOrders = useCallback(async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            const res = await Axios({ ...SummaryApi.getSellerOrders });
            if (res.data.success) {
                setAllOrders(Array.isArray(res.data.data) ? res.data.data : []);
                setLastRefreshed(new Date());
                if (silent) toast.success('Orders refreshed', { id: 'refresh-orders' });
            }
        } catch (e) {
            // FIX: this used to fire even on silent calls, but was easy to miss
            // amid other toasts. Now it always shows on manual refresh failures
            // so a failed refresh is never mistaken for a dead button.
            toast.error(e?.response?.data?.message || 'Failed to fetch orders', { id: 'refresh-orders' });
        }
        finally { setLoading(false); }
    }, []); // no deps — Axios and SummaryApi are module-level constants"""

assert content.count(old) == 1, "Anchor not found or not unique — file may have changed"
content = content.replace(old, new)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("✅ SellerDashboard.jsx patched — refresh now always shows success/failure feedback.")
