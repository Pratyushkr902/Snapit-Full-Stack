// components/OrderTracking.jsx
// ✅ LIVE GROCERY DELIVERY TRACKING with animated steps + ETA
import { useState, useEffect } from "react";

const STEPS = [
  { key: "confirmed", label: "Order Confirmed", sub: "We received your order", icon: "✅" },
  { key: "packed", label: "Packing Items", sub: "Your groceries are being picked & packed", icon: "📦" },
  { key: "on_the_way", label: "Out for Delivery", sub: "Delivery partner is on the way", icon: "🛵" },
  { key: "delivered", label: "Delivered!", sub: "Enjoy your groceries 🥦", icon: "🎉" },
];

export default function OrderTracking({ orderId = "ORD092" }) {
  const [stepIndex, setStepIndex] = useState(1);
  const [eta, setEta] = useState(18);

  // Simulate live progression
  useEffect(() => {
    if (stepIndex >= STEPS.length - 1) return;
    const t = setTimeout(() => {
      setStepIndex((s) => s + 1);
      setEta((e) => Math.max(0, e - 6));
    }, 4000);
    return () => clearTimeout(t);
  }, [stepIndex]);

  const currentStep = STEPS[stepIndex];

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <p style={styles.orderId}>Order #{orderId}</p>
          <p style={styles.currentLabel}>{currentStep.icon} {currentStep.label}</p>
          <p style={styles.currentSub}>{currentStep.sub}</p>
        </div>
        {stepIndex < STEPS.length - 1 && (
          <div style={styles.etaBox}>
            <p style={styles.etaNum}>{eta}</p>
            <p style={styles.etaMin}>mins</p>
          </div>
        )}
      </div>

      {/* Timeline */}
      <div style={styles.timeline}>
        {STEPS.map((step, i) => {
          const done = i < stepIndex;
          const active = i === stepIndex;
          return (
            <div key={step.key} style={styles.stepRow}>
              <div style={styles.stepLeft}>
                <div style={{
                  ...styles.dot,
                  background: done || active ? "#2E7D32" : "#e0e0e0",
                  transform: active ? "scale(1.25)" : "scale(1)",
                  boxShadow: active ? "0 0 0 4px rgba(46,125,50,0.2)" : "none",
                }}>
                  {done ? "✓" : active ? "●" : ""}
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{
                    ...styles.line,
                    background: done ? "#2E7D32" : "#e0e0e0",
                  }} />
                )}
              </div>
              <div style={{ ...styles.stepContent, opacity: done || active ? 1 : 0.4 }}>
                <p style={{ ...styles.stepLabel, fontWeight: active ? 700 : 500 }}>{step.icon} {step.label}</p>
                {active && <p style={styles.stepSub}>{step.sub}</p>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Delivery Details */}
      {stepIndex === 2 && (
        <div style={styles.deliveryCard}>
          <div style={styles.agentRow}>
            <div style={styles.agentAvatar}>🧑</div>
            <div>
              <p style={styles.agentName}>Rajan Kumar</p>
              <p style={styles.agentRole}>Delivery Partner • ⭐ 4.8</p>
            </div>
            <button style={styles.callBtn}>📞 Call</button>
          </div>
        </div>
      )}

      {/* ETA Banner */}
      {stepIndex < STEPS.length - 1 && (
        <div style={styles.etaBanner}>
          ⚡ Estimated delivery in <strong>{eta} minutes</strong>
        </div>
      )}

      {/* Delivered */}
      {stepIndex === STEPS.length - 1 && (
        <div style={styles.deliveredBox}>
          <p style={styles.deliveredText}>🎉 Delivered Successfully!</p>
          <p style={styles.deliveredSub}>Rate your delivery experience</p>
          <div style={styles.stars}>
            {[1, 2, 3, 4, 5].map((s) => (
              <span key={s} style={{ fontSize: 28, cursor: "pointer" }}>⭐</span>
            ))}
          </div>
        </div>
      )}

      {/* Support */}
      <button style={styles.supportBtn}>🆘 Need Help with this Order?</button>
    </div>
  );
}

const styles = {
  container: { background: "#fff", borderRadius: 20, padding: 20, maxWidth: 420, margin: "0 auto", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" },
  header: { display: "flex", justifyContent: "space-between", marginBottom: 24 },
  orderId: { fontSize: 12, color: "#aaa", margin: 0 },
  currentLabel: { fontSize: 18, fontWeight: 800, color: "#1a1a1a", margin: "4px 0 2px" },
  currentSub: { fontSize: 12, color: "#666", margin: 0 },
  etaBox: { background: "#2E7D32", borderRadius: 14, padding: "10px 16px", textAlign: "center", alignSelf: "flex-start" },
  etaNum: { fontSize: 24, fontWeight: 900, color: "#fff", margin: 0 },
  etaMin: { fontSize: 11, color: "rgba(255,255,255,0.8)", margin: 0 },
  timeline: { marginBottom: 16 },
  stepRow: { display: "flex", gap: 14 },
  stepLeft: { display: "flex", flexDirection: "column", alignItems: "center", width: 24 },
  dot: {
    width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
    display: "flex", alignItems: "center", justifyContent: "center",
    color: "#fff", fontSize: 11, fontWeight: 700, transition: "all 0.3s",
  },
  line: { width: 2, flex: 1, minHeight: 24, transition: "background 0.3s" },
  stepContent: { paddingBottom: 20, flex: 1, transition: "opacity 0.3s" },
  stepLabel: { fontSize: 14, color: "#222", margin: 0 },
  stepSub: { fontSize: 12, color: "#2E7D32", margin: "3px 0 0", fontStyle: "italic" },
  deliveryCard: { background: "#f1f8e9", borderRadius: 12, padding: "12px 14px", marginBottom: 12 },
  agentRow: { display: "flex", alignItems: "center", gap: 10 },
  agentAvatar: { fontSize: 32, background: "#c8e6c9", borderRadius: "50%", width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center" },
  agentName: { fontSize: 14, fontWeight: 700, color: "#1a1a1a", margin: 0 },
  agentRole: { fontSize: 12, color: "#666", margin: "2px 0 0" },
  callBtn: { marginLeft: "auto", background: "#2E7D32", color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", fontWeight: 700, cursor: "pointer" },
  etaBanner: { background: "#f1f8e9", border: "1px solid #a5d6a7", borderRadius: 10, padding: "10px 14px", textAlign: "center", fontSize: 14, color: "#333", marginBottom: 12 },
  deliveredBox: { background: "#f1f8e9", borderRadius: 14, padding: 16, textAlign: "center", marginBottom: 12 },
  deliveredText: { fontSize: 18, fontWeight: 800, color: "#2E7D32", margin: "0 0 4px" },
  deliveredSub: { fontSize: 13, color: "#555", margin: "0 0 10px" },
  stars: { display: "flex", justifyContent: "center", gap: 4 },
  supportBtn: { width: "100%", background: "#f5f5f5", border: "none", borderRadius: 10, padding: "12px", fontSize: 13, fontWeight: 600, color: "#555", cursor: "pointer" },
};