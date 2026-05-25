// components/ScheduledOrders.jsx
// ✅ SCHEDULED GROCERY ORDERS - Set daily/weekly auto-delivery of essentials
import { useState } from "react";

const DEFAULT_SCHEDULES = [
  {
    id: 1,
    name: "Daily Milk",
    items: ["Amul Milk 1L"],
    frequency: "Every Day",
    time: "7:00 AM",
    amount: 62,
    active: true,
  },
  {
    id: 2,
    name: "Weekly Vegetables",
    items: ["Tomato 500g", "Onion 1kg", "Potato 1kg", "Spinach 250g"],
    frequency: "Every Monday",
    time: "8:00 AM",
    amount: 145,
    active: true,
  },
];

const FREQUENCY_OPTIONS = [
  "Every Day",
  "Weekdays (Mon–Fri)",
  "Weekends",
  "Every Monday",
  "Every Week",
];

const GROCERY_ITEMS = [
  { id: "milk", name: "Amul Milk 1L", price: 62, icon: "🥛" },
  { id: "bread", name: "Britannia Bread", price: 38, icon: "🍞" },
  { id: "eggs", name: "Eggs (12)", price: 84, icon: "🥚" },
  { id: "curd", name: "Dahi 400g", price: 45, icon: "🥣" },
  { id: "tomato", name: "Tomato 500g", price: 28, icon: "🍅" },
  { id: "onion", name: "Onion 1kg", price: 35, icon: "🧅" },
];

export default function ScheduledOrders() {
  const [schedules, setSchedules] = useState(DEFAULT_SCHEDULES);
  const [showCreate, setShowCreate] = useState(false);
  const [newSched, setNewSched] = useState({ name: "", frequency: "Every Day", time: "08:00", selectedItems: [] });

  const toggleActive = (id) => {
    setSchedules((prev) => prev.map((s) => s.id === id ? { ...s, active: !s.active } : s));
  };

  const deleteSchedule = (id) => {
    setSchedules((prev) => prev.filter((s) => s.id !== id));
  };

  const toggleItem = (itemId) => {
    setNewSched((prev) => ({
      ...prev,
      selectedItems: prev.selectedItems.includes(itemId)
        ? prev.selectedItems.filter((x) => x !== itemId)
        : [...prev.selectedItems, itemId],
    }));
  };

  const handleCreate = () => {
    if (!newSched.name || newSched.selectedItems.length === 0) return;
    const items = GROCERY_ITEMS.filter((g) => newSched.selectedItems.includes(g.id));
    const amount = items.reduce((s, i) => s + i.price, 0);
    setSchedules((prev) => [
      ...prev,
      {
        id: Date.now(),
        name: newSched.name,
        items: items.map((i) => i.name),
        frequency: newSched.frequency,
        time: newSched.time,
        amount,
        active: true,
      },
    ]);
    setNewSched({ name: "", frequency: "Every Day", time: "08:00", selectedItems: [] });
    setShowCreate(false);
  };

  const activeSchedules = schedules.filter((s) => s.active);
  const monthlySpend = activeSchedules.reduce((s, sch) => {
    const multiplier = sch.frequency === "Every Day" ? 30 : sch.frequency.includes("Week") ? 4 : 20;
    return s + sch.amount * multiplier;
  }, 0);

  return (
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <h2 style={styles.pageTitle}>⏰ Scheduled Orders</h2>
        <div style={styles.monthlySpend}>
          <p style={styles.spendLabel}>Monthly Est.</p>
          <p style={styles.spendAmt}>₹{monthlySpend}</p>
        </div>
      </div>

      {/* Active Schedules */}
      {schedules.map((sch) => (
        <div key={sch.id} style={{ ...styles.schedCard, opacity: sch.active ? 1 : 0.6 }}>
          <div style={styles.schedHeader}>
            <div>
              <p style={styles.schedName}>{sch.name}</p>
              <p style={styles.schedFreq}>📅 {sch.frequency} at {sch.time}</p>
            </div>
            <div style={styles.schedRight}>
              {/* Toggle */}
              <div
                style={{ ...styles.toggle, background: sch.active ? "#2E7D32" : "#ccc" }}
                onClick={() => toggleActive(sch.id)}
              >
                <div style={{ ...styles.toggleThumb, transform: sch.active ? "translateX(20px)" : "translateX(2px)" }} />
              </div>
            </div>
          </div>
          <div style={styles.schedItems}>
            {sch.items.map((item, i) => (
              <span key={i} style={styles.itemTag}>{item}</span>
            ))}
          </div>
          <div style={styles.schedFooter}>
            <span style={styles.schedAmt}>₹{sch.amount}/delivery</span>
            <button style={styles.deleteBtn} onClick={() => deleteSchedule(sch.id)}>🗑 Delete</button>
          </div>
        </div>
      ))}

      {/* Create New */}
      <button style={styles.createBtn} onClick={() => setShowCreate(!showCreate)}>
        {showCreate ? "✕ Cancel" : "+ NEW SCHEDULE"}
      </button>

      {showCreate && (
        <div style={styles.createForm}>
          <h3 style={styles.formTitle}>Create New Schedule</h3>
          <input
            style={styles.input}
            placeholder="Schedule Name (e.g. Daily Milk)"
            value={newSched.name}
            onChange={(e) => setNewSched((p) => ({ ...p, name: e.target.value }))}
          />
          <label style={styles.label}>Frequency</label>
          <select
            style={styles.select}
            value={newSched.frequency}
            onChange={(e) => setNewSched((p) => ({ ...p, frequency: e.target.value }))}
          >
            {FREQUENCY_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
          <label style={styles.label}>Delivery Time</label>
          <input
            style={styles.input}
            type="time"
            value={newSched.time}
            onChange={(e) => setNewSched((p) => ({ ...p, time: e.target.value }))}
          />
          <label style={styles.label}>Select Items</label>
          <div style={styles.itemsGrid}>
            {GROCERY_ITEMS.map((item) => {
              const sel = newSched.selectedItems.includes(item.id);
              return (
                <div
                  key={item.id}
                  style={{ ...styles.itemChip, background: sel ? "#e8f5e9" : "#f5f5f5", border: `2px solid ${sel ? "#2E7D32" : "#e0e0e0"}` }}
                  onClick={() => toggleItem(item.id)}
                >
                  <span style={{ fontSize: 18 }}>{item.icon}</span>
                  <div>
                    <p style={styles.chipName}>{item.name}</p>
                    <p style={styles.chipPrice}>₹{item.price}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <button style={styles.saveBtn} onClick={handleCreate}>
            ✅ Create Schedule
          </button>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { background: "#f4f6f0", padding: 16, minHeight: "100vh" },
  headerRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  pageTitle: { fontSize: 20, fontWeight: 800, color: "#1a1a1a", margin: 0 },
  monthlySpend: { background: "#2E7D32", borderRadius: 12, padding: "8px 14px", textAlign: "center" },
  spendLabel: { fontSize: 10, color: "rgba(255,255,255,0.75)", margin: 0 },
  spendAmt: { fontSize: 16, fontWeight: 800, color: "#fff", margin: 0 },
  schedCard: { background: "#fff", borderRadius: 16, padding: 16, marginBottom: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.07)", transition: "opacity 0.2s" },
  schedHeader: { display: "flex", justifyContent: "space-between", marginBottom: 10 },
  schedName: { fontSize: 15, fontWeight: 700, color: "#1a1a1a", margin: 0 },
  schedFreq: { fontSize: 12, color: "#666", margin: "3px 0 0" },
  schedRight: { display: "flex", alignItems: "center" },
  toggle: { width: 44, height: 24, borderRadius: 12, position: "relative", cursor: "pointer", transition: "background 0.2s", flexShrink: 0 },
  toggleThumb: { position: "absolute", top: 2, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "transform 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.2)" },
  schedItems: { display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 },
  itemTag: { background: "#f1f8e9", color: "#2E7D32", fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 20, border: "1px solid #c8e6c9" },
  schedFooter: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  schedAmt: { fontSize: 14, fontWeight: 700, color: "#2E7D32" },
  deleteBtn: { background: "none", border: "none", color: "#e53935", fontSize: 12, fontWeight: 600, cursor: "pointer" },
  createBtn: { width: "100%", background: "#f1f8e9", border: "2px dashed #2E7D32", borderRadius: 12, padding: "13px", color: "#2E7D32", fontWeight: 800, fontSize: 14, cursor: "pointer", marginBottom: 14 },
  createForm: { background: "#fff", borderRadius: 16, padding: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" },
  formTitle: { fontSize: 15, fontWeight: 700, marginBottom: 14, color: "#1a1a1a" },
  label: { display: "block", fontSize: 12, color: "#666", fontWeight: 600, marginBottom: 6 },
  input: { width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 13, marginBottom: 12, boxSizing: "border-box" },
  select: { width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 13, marginBottom: 12, background: "#fff" },
  itemsGrid: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 },
  itemChip: { display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, cursor: "pointer" },
  chipName: { fontSize: 13, fontWeight: 500, margin: 0 },
  chipPrice: { fontSize: 12, color: "#2E7D32", fontWeight: 700, margin: "2px 0 0" },
  saveBtn: { width: "100%", background: "#2E7D32", color: "#fff", border: "none", borderRadius: 10, padding: 13, fontWeight: 700, fontSize: 14, cursor: "pointer" },
};