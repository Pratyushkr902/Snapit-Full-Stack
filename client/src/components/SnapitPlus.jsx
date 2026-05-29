import { useState } from "react";
import Axios from "../utils/Axios";
import { toast } from "react-hot-toast";

const BENEFITS = [
  { icon: "🚚", title: "FREE Delivery", desc: "On all grocery orders ₹99+", savings: "Save ₹15-25/order" },
  { icon: "⚡", title: "Express Delivery", desc: "30-min delivery on priority", savings: "Faster than standard" },
  { icon: "💰", title: "Exclusive Member Prices", desc: "Lower prices on 500+ products", savings: "Avg 8% cheaper" },
  { icon: "💳", title: "5% Wallet Cashback", desc: "On every grocery order", savings: "Auto-credited" },
  { icon: "🎁", title: "Weekly Surprise Box", desc: "Free product sample each week", savings: "Worth ₹50-100" },
  { icon: "🧾", title: "GST Invoice", desc: "For business expense claims", savings: "Pro feature" },
  { icon: "📅", title: "Schedule Deliveries", desc: "Daily/weekly auto-orders", savings: "Never run out" },
  { icon: "🎂", title: "Birthday Month Bonus", desc: "₹200 free wallet credit", savings: "Once a year" },
];

export default function SnapitPlus({ isAlreadyMember = false, onSuccess }) {
  const [plan, setPlan] = useState("monthly");
  const [loading, setLoading] = useState(false);
  const [isMember, setIsMember] = useState(isAlreadyMember);

  const ordersPerMonth = 12;
  const deliveryPerOrder = 20;
  const withoutPlus = ordersPerMonth * deliveryPerOrder;
  const planPrice = plan === "monthly" ? 99 : 899;
  const savings = withoutPlus - planPrice;

  const handleCheckoutPayment = async () => {
    setLoading(true);
    try {
      const keyRes = await Axios({ url: '/api/payment/razorpay-key', method: 'get' });
      if (!keyRes.data.success) throw new Error("Could not acquire gateway keys.");

      const orderRes = await Axios({ url: '/api/payment/subscribe-snapitplus', method: 'post', data: { planType: plan } });
      if (!orderRes.data.success) throw new Error("Order creation failed.");

      const { id: razorpay_order_id, amount, currency } = orderRes.data.order;

      const options = {
        key: keyRes.data.key,
        amount,
        currency,
        name: "Snapit Plus VIP",
        description: `Premium Grocery Access Pass — ${plan === 'yearly' ? '12 Months' : '30 Days'}`,
        image: "https://cdn-icons-png.flaticon.com/512/2972/2972185.png",
        order_id: razorpay_order_id,
        handler: async function (response) {
          try {
            const verifyRes = await Axios({
              url: '/api/payment/verify-subscription',
              method: 'post',
              data: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                planType: plan
              }
            });
            if (verifyRes.data.success) {
              toast.success("Welcome to Snapit Plus Club! 🎉");
              setIsMember(true);
              if (onSuccess) onSuccess();
            }
          } catch (verifyErr) {
            toast.error("Payment verification failed. Contact support.");
          }
        },
        theme: { color: "#1B5E20" }
      };

      const gatewaySheet = new window.Razorpay(options);
      gatewaySheet.open();

    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to launch subscription gateway.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.hero}>
        <div style={styles.heroGlow} />
        <p style={styles.heroIcon}>⭐</p>
        <h1 style={styles.heroTitle}>Snapit Plus</h1>
        <p style={styles.heroTagline}>Your grocery store membership</p>
        {isMember ? (
          <div style={{ ...styles.heroBadge, background: '#FFD700', color: '#000' }}>👑 Active VIP Member</div>
        ) : (
          <div style={styles.heroBadge}>⚡ Instant Activation</div>
        )}
      </div>

      {!isMember && (
        <div style={styles.planRow}>
          <button style={{ ...styles.planBtn, ...(plan === "monthly" ? styles.planActive : {}) }} onClick={() => setPlan("monthly")}>
            <p style={styles.planName}>Monthly</p>
            <p style={styles.planPrice}>₹99 <span style={styles.planPer}>/mo</span></p>
          </button>
          <button style={{ ...styles.planBtn, ...(plan === "yearly" ? styles.planActive : {}) }} onClick={() => setPlan("yearly")}>
            <div style={styles.saveBadge}>SAVE ₹290</div>
            <p style={styles.planName}>Yearly</p>
            <p style={styles.planPrice}>₹899 <span style={styles.planPer}>/yr</span></p>
            <p style={styles.planMonthly}>= ₹75/month</p>
          </button>
        </div>
      )}

      {!isMember && (
        <div style={styles.roiCard}>
          <h3 style={styles.roiTitle}>💡 Is it Worth It for You?</h3>
          <p style={styles.roiNote}>Based on {ordersPerMonth} grocery orders/month</p>
          <div style={styles.roiRows}>
            <div style={styles.roiRow}>
              <span>Delivery charges without Plus</span>
              <span style={styles.roiCross}>₹{withoutPlus}</span>
            </div>
            <div style={styles.roiRow}>
              <span>Plus membership</span>
              <span style={{ color: "#2E7D32", fontWeight: 700 }}>₹{planPrice}</span>
            </div>
            <div style={{ ...styles.roiRow, borderTop: "1px solid #e0e0e0", paddingTop: 8, marginTop: 4 }}>
              <span style={{ fontWeight: 700 }}>You Save</span>
              <span style={{ color: savings > 0 ? "#2E7D32" : "#c62828", fontWeight: 800, fontSize: 16 }}>
                {savings > 0 ? `₹${savings}/mo` : "Not worth it yet"}
              </span>
            </div>
          </div>
        </div>
      )}

      <div style={styles.benefitsCard}>
        <h3 style={styles.benefitsTitle}>Everything You Get</h3>
        {BENEFITS.map((b) => (
          <div key={b.title} style={styles.benefitRow}>
            <span style={styles.bIcon}>{b.icon}</span>
            <div style={styles.bInfo}>
              <p style={styles.bTitle}>{b.title}</p>
              <p style={styles.bDesc}>{b.desc}</p>
            </div>
            <span style={styles.bSavings}>{b.savings}</span>
          </div>
        ))}
      </div>

      {isMember ? (
        <div style={{ ...styles.ctaBtn, background: '#1B5E20', textAlign: 'center', cursor: 'default', boxShadow: 'none' }}>
          ✓ MEMBERSHIP ACTIVE — ENJOY FREE DELIVERY
        </div>
      ) : (
        <button style={{ ...styles.ctaBtn, opacity: loading ? 0.75 : 1 }} onClick={handleCheckoutPayment} disabled={loading}>
          {loading ? "PROCESSING..." : `ACTIVATE SNAPIT PLUS — ₹${planPrice}`}
        </button>
      )}
      <p style={styles.ctaNote}>Secure payment via Razorpay</p>
    </div>
  );
}

const styles = {
  page: { background: "#f4f6f0", padding: 16, minHeight: "100vh" },
  hero: { background: "linear-gradient(160deg, #0D3B0F, #1B5E20)", borderRadius: 20, padding: "28px 20px", textAlign: "center", marginBottom: 16, position: "relative", overflow: "hidden" },
  heroGlow: { position: "absolute", top: -40, right: -40, width: 120, height: 120, borderRadius: "50%", background: "rgba(102,187,106,0.2)" },
  heroIcon: { fontSize: 44, margin: "0 0 8px" },
  heroTitle: { fontSize: 34, fontWeight: 900, color: "#fff", margin: 0 },
  heroTagline: { fontSize: 14, color: "rgba(255,255,255,0.7)", margin: "8px 0 16px" },
  heroBadge: { display: "inline-block", background: "#66BB6A", color: "#fff", fontWeight: 800, fontSize: 14, padding: "6px 18px", borderRadius: 20 },
  planRow: { display: "flex", gap: 12, marginBottom: 14 },
  planBtn: { flex: 1, background: "#fff", border: "2px solid #ddd", borderRadius: 16, padding: "14px 12px", textAlign: "center", cursor: "pointer", position: "relative", transition: "all 0.2s" },
  planActive: { border: "2px solid #2E7D32", background: "#f1f8e9" },
  planName: { fontSize: 13, color: "#666", margin: 0 },
  planPrice: { fontSize: 22, fontWeight: 900, color: "#1a1a1a", margin: "4px 0 0" },
  planPer: { fontSize: 13, fontWeight: 400, color: "#888" },
  planMonthly: { fontSize: 11, color: "#2E7D32", fontWeight: 600, margin: "2px 0 0" },
  saveBadge: { position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", background: "#FF6F00", color: "#fff", fontSize: 10, fontWeight: 800, padding: "3px 10px", borderRadius: 20, whiteSpace: "nowrap" },
  roiCard: { background: "#fff", borderRadius: 16, padding: 16, marginBottom: 14 },
  roiTitle: { fontSize: 15, fontWeight: 700, color: "#1a1a1a", margin: "0 0 4px" },
  roiNote: { fontSize: 12, color: "#888", margin: "0 0 12px" },
  roiRows: {},
  roiRow: { display: "flex", justifyContent: "space-between", fontSize: 13, color: "#555", padding: "5px 0" },
  roiCross: { fontWeight: 600, color: "#c62828", textDecoration: "line-through" },
  benefitsCard: { background: "#fff", borderRadius: 16, padding: 16, marginBottom: 16 },
  benefitsTitle: { fontSize: 15, fontWeight: 700, color: "#1a1a1a", marginBottom: 14 },
  benefitRow: { display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid #f5f5f5" },
  bIcon: { fontSize: 22, width: 36, textAlign: "center" },
  bInfo: { flex: 1 },
  bTitle: { fontSize: 13, fontWeight: 700, color: "#222", margin: 0 },
  bDesc: { fontSize: 11, color: "#888", margin: "2px 0 0" },
  bSavings: { fontSize: 10, color: "#2E7D32", fontWeight: 600, textAlign: "right", maxWidth: 80 },
  ctaBtn: { width: "100%", background: "linear-gradient(135deg, #1B5E20, #2E7D32)", color: "#fff", border: "none", borderRadius: 14, padding: "16px", fontWeight: 800, fontSize: 16, cursor: "pointer", boxShadow: "0 4px 16px rgba(46,125,50,0.35)" },
  ctaNote: { textAlign: "center", fontSize: 12, color: "#888", margin: "10px 0 0" },
};