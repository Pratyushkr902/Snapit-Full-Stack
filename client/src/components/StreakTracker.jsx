import { useState, useEffect } from "react";
import Axios from "../utils/Axios.js"; // adjust path if needed

const MILESTONES = [
  { days: 3,  reward: "₹20 off",                  icon: "🎁" },
  { days: 7,  reward: "Free Delivery (3 orders)",  icon: "🚚" },
  { days: 14, reward: "₹100 wallet credit",         icon: "💰" },
  { days: 30, reward: "Snapit Plus FREE",           icon: "⭐" },
];

const DAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function StreakTracker() {
  const [streak, setStreak] = useState(0);
  const [claimedRewards, setClaimedRewards] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Axios.get('/api/user/user-details').then(res => {
      const data = res.data.data
      setStreak(data.currentStreak || 0)
      setClaimedRewards(data.claimedMilestones || [])
    }).finally(() => setLoading(false))
  }, [])

  const nextMilestone = MILESTONES.find((m) => m.days > streak);
  const claimable = MILESTONES.filter((m) => m.days <= streak && !claimedRewards.includes(m.days));

  const handleClaim = async (days) => {
    try {
      const res = await Axios.post('/api/streak/claim', { milestone: days })
      if (res.data.success) {
        setClaimedRewards(prev => [...prev, days])
        alert(`🎉 ${res.data.message}`)
      }
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to claim reward")
    }
  }

  if (loading) return <div style={{ padding: 20, textAlign: 'center' }}>Loading streak...</div>

  return (
    <div style={styles.container}>
      {/* Streak Header */}
      <div style={styles.header}>
        <div style={styles.fireBox}>
          <span style={styles.fireIcon}>🔥</span>
          <span style={styles.streakNum}>{streak}</span>
          <span style={styles.streakLabel}>Day Streak</span>
        </div>
        <div style={styles.headerRight}>
          <p style={styles.headerTitle}>Keep Ordering Daily!</p>
          <p style={styles.headerSub}>Order groceries every day to earn rewards</p>
          {nextMilestone && (
            <p style={styles.nextHint}>
              🎯 {nextMilestone.days - streak} more days → {nextMilestone.reward}
            </p>
          )}
        </div>
      </div>

      {/* Days Grid */}
      <div style={styles.daysGrid}>
        {DAYS_SHORT.map((day, i) => (
          <div key={i} style={styles.dayCol}>
            <div style={{
              ...styles.dayCircle,
              background: i < streak % 7 || streak >= 7 ? "#2E7D32" : "#f0f0f0",
              color: i < streak % 7 || streak >= 7 ? "#fff" : "#bbb",
            }}>
              {(i < streak % 7 || streak >= 7) ? "✓" : ""}
            </div>
            <span style={{ ...styles.dayText, color: (i < streak % 7 || streak >= 7) ? "#2E7D32" : "#bbb" }}>
              {day}
            </span>
          </div>
        ))}
      </div>

      {/* Claimable Rewards */}
      {claimable.length > 0 && (
        <div style={styles.claimSection}>
          <p style={styles.claimTitle}>🎁 Rewards Ready to Claim!</p>
          {claimable.map((m) => (
            <div key={m.days} style={styles.claimCard}>
              <span style={{ fontSize: 24 }}>{m.icon}</span>
              <div style={styles.claimInfo}>
                <p style={styles.claimReward}>{m.reward}</p>
                <p style={styles.claimDays}>{m.days}-day milestone</p>
              </div>
              <button style={styles.claimBtn} onClick={() => handleClaim(m.days)}>
                CLAIM
              </button>
            </div>
          ))}
        </div>
      )}

      {/* All Milestones */}
      <div style={styles.milestonesSection}>
        <p style={styles.milestonesTitle}>All Milestones</p>
        {MILESTONES.map((m) => {
          const achieved = streak >= m.days;
          const claimed = claimedRewards.includes(m.days);
          return (
            <div key={m.days} style={{
              ...styles.milestoneRow,
              background: achieved ? "#f1f8e9" : "#fafafa",
              border: `1px solid ${achieved ? "#a5d6a7" : "#eee"}`,
            }}>
              <span style={{ fontSize: 22 }}>{m.icon}</span>
              <div style={styles.mlInfo}>
                <p style={styles.mlDays}>{m.days} Days</p>
                <p style={{ ...styles.mlReward, color: achieved ? "#2E7D32" : "#aaa" }}>{m.reward}</p>
              </div>
              <span style={styles.mlStatus}>
                {claimed ? "✅ Claimed" : achieved ? "🎁 Ready" : `🔒 ${m.days - streak}d left`}
              </span>
            </div>
          );
        })}
      </div>

      {/* Progress Bar */}
      {nextMilestone && (
        <div style={styles.progressSection}>
          <div style={styles.progressBar}>
            <div style={{
              ...styles.progressFill,
              width: `${Math.min((streak / nextMilestone.days) * 100, 100)}%`,
            }} />
          </div>
          <p style={styles.progressText}>{streak} / {nextMilestone.days} days to next reward</p>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { background: "#fff", borderRadius: 20, padding: 20, margin: "12px 0", boxShadow: "0 2px 14px rgba(0,0,0,0.08)" },
  header: { display: "flex", gap: 14, alignItems: "center", marginBottom: 20 },
  fireBox: { background: "linear-gradient(135deg, #FF6F00, #FFA000)", borderRadius: 16, padding: "14px 16px", textAlign: "center", flexShrink: 0 },
  fireIcon: { display: "block", fontSize: 28 },
  streakNum: { display: "block", fontSize: 32, fontWeight: 900, color: "#fff", lineHeight: 1 },
  streakLabel: { display: "block", fontSize: 10, color: "rgba(255,255,255,0.8)", fontWeight: 600 },
  headerRight: { flex: 1 },
  headerTitle: { fontSize: 16, fontWeight: 800, color: "#1a1a1a", margin: 0 },
  headerSub: { fontSize: 12, color: "#888", margin: "3px 0 6px" },
  nextHint: { fontSize: 12, color: "#2E7D32", fontWeight: 600, background: "#f1f8e9", padding: "4px 8px", borderRadius: 6, margin: 0 },
  daysGrid: { display: "flex", justifyContent: "space-between", marginBottom: 20 },
  dayCol: { display: "flex", flexDirection: "column", alignItems: "center", gap: 4 },
  dayCircle: { width: 34, height: 34, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, transition: "all 0.3s" },
  dayText: { fontSize: 9, fontWeight: 600 },
  claimSection: { background: "#fff8e1", borderRadius: 14, padding: "12px 14px", marginBottom: 16, border: "1.5px solid #FFD54F" },
  claimTitle: { fontSize: 14, fontWeight: 700, color: "#F57F17", margin: "0 0 10px" },
  claimCard: { display: "flex", alignItems: "center", gap: 10, padding: "8px 0" },
  claimInfo: { flex: 1 },
  claimReward: { fontSize: 14, fontWeight: 700, color: "#333", margin: 0 },
  claimDays: { fontSize: 11, color: "#888", margin: "2px 0 0" },
  claimBtn: { background: "#FF6F00", color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", fontWeight: 800, cursor: "pointer" },
  milestonesSection: { marginBottom: 14 },
  milestonesTitle: { fontSize: 14, fontWeight: 700, color: "#555", marginBottom: 10 },
  milestoneRow: { display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, marginBottom: 8 },
  mlInfo: { flex: 1 },
  mlDays: { fontSize: 13, fontWeight: 700, color: "#222", margin: 0 },
  mlReward: { fontSize: 12, fontWeight: 600, margin: "2px 0 0" },
  mlStatus: { fontSize: 11, fontWeight: 600, color: "#555" },
  progressSection: { marginTop: 4 },
  progressBar: { height: 8, background: "#e0e0e0", borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", background: "linear-gradient(90deg, #2E7D32, #66BB6A)", borderRadius: 4, transition: "width 0.5s" },
  progressText: { fontSize: 11, color: "#888", textAlign: "center", margin: "6px 0 0" },
};