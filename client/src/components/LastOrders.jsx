// components/LastOrders.jsx
// ✅ GROCERY REORDER - Shows last 3 grocery orders with one-tap reorder
import { useState } from "react";

const mockLastOrders = [
  {
    id: "ORD001",
    items: "Amul Milk 1L, Bread, Eggs (12), Onion 1kg",
    total: 185,
    time: "Today 9:00 AM",
    itemCount: 4,
  },
  {
    id: "ORD002",
    items: "Tata Salt, Maggi 4-pack, Tomato 500g, Dahi 400g",
    total: 210,
    time: "Yesterday 6:30 PM",
    itemCount: 4,
  },
  {
    id: "ORD003",
    items: "Atta 5kg, Sugar 1kg, Refined Oil 1L",
    total: 375,
    time: "3 days ago",
    itemCount: 3,
  },
];

export default function LastOrders({ onReorder }) {
  const [reordering, setReordering] = useState(null);
  const [done, setDone] = useState([]);

  const handleReorder = async (order) => {
    setReordering(order.id);
    await new Promise((r) => setTimeout(r, 1400));
    setReordering(null);
    setDone((prev) => [...prev, order.id]);
    onReorder?.(order);
  };

  return (
    <div style={styles.container}>
      <div style={styles.headerRow}>
        <h3 style={styles.heading}>🔄 Order Again</h3>
        <span style={styles.seeAll}>See All</span>
      </div>

      {mockLastOrders.map((order) => {
        const isDone = done.includes(order.id);
        const isLoading = reordering === order.id;
        return (
          <div key={order.id} style={styles.card}>
            <div style={styles.iconBox}>🛒</div>
            <div style={styles.info}>
              <p style={styles.items}>{order.items}</p>
              <p style={styles.meta}>
                {order.itemCount} items • ₹{order.total} • {order.time}
              </p>
            </div>
            <button
              style={{
                ...styles.button,
                background: isDone ? "#4CAF50" : "#2E7D32",
                opacity: isLoading ? 0.75 : 1,
              }}
              onClick={() => handleReorder(order)}
              disabled={isLoading || isDone}
            >
              {isDone ? "✅ Added" : isLoading ? "..." : "REORDER"}
            </button>
          </div>
        );
      })}
    </div>
  );
}

const styles = {
  container: {
    background: "#fff",
    borderRadius: 16,
    padding: "16px",
    margin: "12px 0",
    boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  heading: { fontSize: 16, fontWeight: 700, color: "#1a1a1a", margin: 0 },
  seeAll: { fontSize: 13, color: "#2E7D32", fontWeight: 600, cursor: "pointer" },
  card: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "12px 0",
    borderBottom: "1px solid #f5f5f5",
  },
  iconBox: {
    fontSize: 24,
    background: "#f1f8e9",
    borderRadius: 10,
    width: 44,
    height: 44,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  info: { flex: 1 },
  items: {
    fontSize: 13,
    fontWeight: 600,
    color: "#222",
    margin: 0,
    display: "-webkit-box",
    WebkitLineClamp: 1,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },
  meta: { fontSize: 11, color: "#888", margin: "4px 0 0" },
  button: {
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "8px 14px",
    fontWeight: 700,
    fontSize: 12,
    cursor: "pointer",
    transition: "all 0.2s",
    whiteSpace: "nowrap",
  },
};