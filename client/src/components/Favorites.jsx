// components/Favorites.jsx
// ✅ GROCERY FAVORITES - Save frequent grocery combos as packs, reorder instantly
import { useState } from "react";

const DEFAULT_PACKS = [
  { id: 1, name: "Weekly Essentials", items: ["Milk 1L", "Bread", "Eggs (12)", "Dahi"], price: 210, icon: "🛒", itemCount: 4 },
  { id: 2, name: "Morning Basics", items: ["Amul Butter", "Bread", "Tea Powder 100g"], price: 155, icon: "🌅", itemCount: 3 },
  { id: 3, name: "Dal-Chawal Kit", items: ["Basmati Rice 1kg", "Toor Dal 500g", "Onion 1kg", "Tomato 500g"], price: 195, icon: "🍚", itemCount: 4 },
];

const GROCERY_SUGGESTIONS = [
  { id: "milk", name: "Amul Milk 1L", price: 62, icon: "🥛" },
  { id: "bread", name: "Britannia Bread", price: 38, icon: "🍞" },
  { id: "eggs", name: "Eggs (12 pcs)", price: 84, icon: "🥚" },
  { id: "rice", name: "Basmati Rice 1kg", price: 95, icon: "🍚" },
  { id: "oil", name: "Refined Oil 1L", price: 135, icon: "🫙" },
  { id: "atta", name: "Atta 5kg", price: 220, icon: "🌾" },
];

export default function Favorites() {
  const [packs, setPacks] = useState(DEFAULT_PACKS);
  const [ordering, setOrdering] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newPack, setNewPack] = useState({ name: "", selectedItems: [] });
  const [likedItems, setLikedItems] = useState(["milk", "bread"]);

  const handleOrder = async (packId) => {
    setOrdering(packId);
    await new Promise((r) => setTimeout(r, 1300));
    setOrdering(null);
    alert("✅ Items added to cart!");
  };

  const toggleLike = (id) => {
    setLikedItems((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const togglePackItem = (item) => {
    setNewPack((prev) => ({
      ...prev,
      selectedItems: prev.selectedItems.includes(item)
        ? prev.selectedItems.filter((x) => x !== item)
        : [...prev.selectedItems, item],
    }));
  };

  const handleSavePack = () => {
    if (!newPack.name || newPack.selectedItems.length === 0) return;
    const items = GROCERY_SUGGESTIONS.filter((g) => newPack.selectedItems.includes(g.id));
    const total = items.reduce((s, i) => s + i.price, 0);
    setPacks((prev) => [
      ...prev,
      {
        id: Date.now(),
        name: newPack.name,
        items: items.map((i) => i.name),
        price: total,
        icon: "⭐",
        itemCount: items.length,
      },
    ]);
    setNewPack({ name: "", selectedItems: [] });
    setShowCreate(false);
  };

  return (
    <div style={styles.container}>
      {/* Saved Packs */}
      <div style={styles.section}>
        <h3 style={styles.heading}>⭐ Your Grocery Packs</h3>
        {packs.map((pack) => (
          <div key={pack.id} style={styles.packCard}>
            <span style={styles.packIcon}>{pack.icon}</span>
            <div style={styles.packInfo}>
              <p style={styles.packName}>{pack.name}</p>
              <p style={styles.packItems}>{pack.items.slice(0, 3).join(", ")}{pack.itemCount > 3 ? ` +${pack.itemCount - 3} more` : ""}</p>
              <p style={styles.packPrice}>₹{pack.price} • {pack.itemCount} items</p>
            </div>
            <button
              style={{ ...styles.orderBtn, opacity: ordering === pack.id ? 0.7 : 1 }}
              onClick={() => handleOrder(pack.id)}
              disabled={!!ordering}
            >
              {ordering === pack.id ? "⏳" : "🛒 Add"}
            </button>
          </div>
        ))}
        <button style={styles.createBtn} onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? "✕ Cancel" : "+ Create New Pack"}
        </button>
      </div>

      {/* Create Pack Form */}
      {showCreate && (
        <div style={styles.createForm}>
          <h4 style={styles.formTitle}>🛒 Build Your Pack</h4>
          <input
            style={styles.input}
            placeholder="Pack Name (e.g. Weekend Groceries)"
            value={newPack.name}
            onChange={(e) => setNewPack((p) => ({ ...p, name: e.target.value }))}
          />
          <p style={styles.pickLabel}>Select items to include:</p>
          <div style={styles.itemsGrid}>
            {GROCERY_SUGGESTIONS.map((item) => {
              const selected = newPack.selectedItems.includes(item.id);
              return (
                <div
                  key={item.id}
                  style={{ ...styles.itemChip, background: selected ? "#e8f5e9" : "#f5f5f5", border: `2px solid ${selected ? "#2E7D32" : "#e0e0e0"}` }}
                  onClick={() => togglePackItem(item.id)}
                >
                  <span>{item.icon}</span>
                  <span style={styles.chipName}>{item.name}</span>
                  <span style={styles.chipPrice}>₹{item.price}</span>
                </div>
              );
            })}
          </div>
          <button style={styles.saveBtn} onClick={handleSavePack}>
            ✅ Save Pack ({newPack.selectedItems.length} items)
          </button>
        </div>
      )}

      {/* Favourite Items */}
      <div style={styles.section}>
        <h3 style={styles.heading}>❤️ Favourite Items</h3>
        <div style={styles.favGrid}>
          {GROCERY_SUGGESTIONS.map((item) => (
            <div key={item.id} style={styles.favCard}>
              <button style={styles.heartBtn} onClick={() => toggleLike(item.id)}>
                {likedItems.includes(item.id) ? "❤️" : "🤍"}
              </button>
              <span style={styles.favIcon}>{item.icon}</span>
              <p style={styles.favName}>{item.name}</p>
              <p style={styles.favPrice}>₹{item.price}</p>
              <button style={styles.addBtn}>+ Add</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { background: "#f4f6f0", padding: 16, minHeight: "100vh" },
  section: { background: "#fff", borderRadius: 16, padding: 16, marginBottom: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" },
  heading: { fontSize: 16, fontWeight: 700, color: "#1a1a1a", marginBottom: 14 },
  packCard: { display: "flex", alignItems: "center", gap: 10, padding: "12px 0", borderBottom: "1px solid #f5f5f5" },
  packIcon: { fontSize: 28, width: 44, height: 44, background: "#f1f8e9", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" },
  packInfo: { flex: 1 },
  packName: { fontSize: 14, fontWeight: 700, color: "#222", margin: 0 },
  packItems: { fontSize: 11, color: "#777", margin: "2px 0" },
  packPrice: { fontSize: 12, fontWeight: 600, color: "#2E7D32", margin: 0 },
  orderBtn: { background: "#2E7D32", color: "#fff", border: "none", borderRadius: 8, padding: "8px 12px", fontWeight: 700, fontSize: 12, cursor: "pointer" },
  createBtn: { width: "100%", marginTop: 12, padding: 12, background: "#f1f8e9", border: "2px dashed #2E7D32", borderRadius: 10, color: "#2E7D32", fontWeight: 700, fontSize: 13, cursor: "pointer" },
  createForm: { background: "#fff", borderRadius: 16, padding: 16, marginBottom: 14 },
  formTitle: { fontSize: 15, fontWeight: 700, marginBottom: 12 },
  input: { width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 13, marginBottom: 12, boxSizing: "border-box" },
  pickLabel: { fontSize: 13, color: "#666", marginBottom: 8 },
  itemsGrid: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 },
  itemChip: { display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 10, cursor: "pointer", transition: "all 0.15s" },
  chipName: { flex: 1, fontSize: 13, fontWeight: 500 },
  chipPrice: { fontSize: 13, fontWeight: 700, color: "#2E7D32" },
  saveBtn: { width: "100%", background: "#2E7D32", color: "#fff", border: "none", borderRadius: 10, padding: 12, fontWeight: 700, fontSize: 14, cursor: "pointer" },
  favGrid: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 },
  favCard: { background: "#fafafa", borderRadius: 12, padding: "12px 8px", textAlign: "center", position: "relative", border: "1px solid #f0f0f0" },
  heartBtn: { position: "absolute", top: 6, right: 6, background: "none", border: "none", fontSize: 14, cursor: "pointer", padding: 0 },
  favIcon: { fontSize: 28, display: "block", marginBottom: 4 },
  favName: { fontSize: 10, color: "#444", margin: "0 0 4px", fontWeight: 500, lineHeight: 1.3 },
  favPrice: { fontSize: 13, fontWeight: 700, color: "#2E7D32", margin: "0 0 8px" },
  addBtn: { background: "#2E7D32", color: "#fff", border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" },
};