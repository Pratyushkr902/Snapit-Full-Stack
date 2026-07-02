import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";

const baseURL = import.meta.env.VITE_API_URL || "";

export default function AdminSellerStorePanel() {
    const [sellers, setSellers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedSeller, setSelectedSeller] = useState(null);
    const [activeTab, setActiveTab] = useState("orders");
    const [orders, setOrders] = useState([]);
    const [products, setProducts] = useState([]);
    const [earnings, setEarnings] = useState(null);
    const [tabLoading, setTabLoading] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);

    const token = localStorage.getItem("accessToken");
    const authHeader = { headers: { Authorization: `Bearer ${token}` } };

    useEffect(() => {
        fetchSellers();
    }, []);

    const fetchSellers = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${baseURL}/api/admin/sellers`, authHeader);
            setSellers(res.data.data);
        } catch (err) {
            toast.error("Failed to load sellers");
        } finally {
            setLoading(false);
        }
    };

    const openSeller = async (seller) => {
        setSelectedSeller(seller);
        setActiveTab("orders");
        await loadTab(seller._id, "orders");
    };

    const loadTab = async (sellerId, tab) => {
        setTabLoading(true);
        try {
            if (tab === "orders") {
                const res = await axios.get(`${baseURL}/api/admin/sellers/${sellerId}/orders`, authHeader);
                setOrders(res.data.data);
            } else if (tab === "products") {
                const res = await axios.get(`${baseURL}/api/admin/sellers/${sellerId}/products`, authHeader);
                setProducts(res.data.data);
            } else if (tab === "earnings") {
                const res = await axios.get(`${baseURL}/api/admin/sellers/${sellerId}/earnings`, authHeader);
                setEarnings(res.data.data);
            }
        } catch (err) {
            toast.error(`Failed to load ${tab}`);
        } finally {
            setTabLoading(false);
        }
    };

    const switchTab = (tab) => {
        setActiveTab(tab);
        loadTab(selectedSeller._id, tab);
    };

    const saveProduct = async (product) => {
        try {
            await axios.put(
                `${baseURL}/api/admin/sellers/${selectedSeller._id}/products/${product._id}`,
                product,
                authHeader
            );
            toast.success("Product updated");
            setEditingProduct(null);
            loadTab(selectedSeller._id, "products");
        } catch (err) {
            toast.error(err.response?.data?.message || "Update failed");
        }
    };

    if (loading) return <div className="p-6 text-center text-gray-500">Loading sellers...</div>;

    if (selectedSeller) {
        return (
            <div className="p-4 max-w-6xl mx-auto">
                <button
                    onClick={() => setSelectedSeller(null)}
                    className="mb-4 text-sm text-blue-600 hover:underline"
                >
                    ← Back to all sellers
                </button>

                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-xl font-bold">{selectedSeller.store_name}</h2>
                        <p className="text-sm text-gray-500">{selectedSeller.name} · {selectedSeller.email}</p>
                    </div>
                    <span className="text-sm bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full">
                        Rank #{selectedSeller.rank}
                    </span>
                </div>

                <div className="flex gap-2 border-b mb-4">
                    {["orders", "products", "earnings"].map(tab => (
                        <button
                            key={tab}
                            onClick={() => switchTab(tab)}
                            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 ${
                                activeTab === tab ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500"
                            }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {tabLoading ? (
                    <div className="text-center py-8 text-gray-400">Loading...</div>
                ) : (
                    <>
                        {activeTab === "orders" && (
                            <div className="space-y-3">
                                {orders.length === 0 && <p className="text-gray-400 text-sm">No orders yet.</p>}
                                {orders.map(o => (
                                    <div key={o._id} className="border rounded-lg p-3 flex justify-between items-start">
                                        <div>
                                            <p className="font-medium">{o.orderId}</p>
                                            <p className="text-xs text-gray-500">{o.customer?.name} · {new Date(o.createdAt).toLocaleString()}</p>
                                            <div className="mt-1 space-y-0.5">
                                                {o.sellerItems.map((it, i) => (
                                                    <p key={i} className="text-xs text-gray-600">
                                                        {it.name} × {it.quantity} — ₹{it.sellerPrice * it.quantity}
                                                    </p>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className={`text-xs px-2 py-1 rounded-full ${
                                                o.delivery_status === "Delivered" ? "bg-green-100 text-green-700" :
                                                o.delivery_status === "Cancelled" ? "bg-red-100 text-red-700" :
                                                "bg-blue-100 text-blue-700"
                                            }`}>
                                                {o.delivery_status}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {activeTab === "products" && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                {products.map(p => (
                                    <div key={p._id} className="border rounded-lg p-3">
                                        {p.image?.[0] && <img src={p.image[0]} alt={p.name} className="w-full h-28 object-cover rounded mb-2" />}
                                        <p className="font-medium text-sm">{p.name}</p>
                                        <p className="text-xs text-gray-500">Selling ₹{p.sellingPrice} · Stock {p.stock}</p>
                                        <button
                                            onClick={() => setEditingProduct(p)}
                                            className="mt-2 text-xs text-blue-600 hover:underline"
                                        >
                                            Edit
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {activeTab === "earnings" && earnings && (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <StatCard label="Total Orders" value={earnings.totalOrders} />
                                <StatCard label="Items Sold" value={earnings.itemsSold} />
                                <StatCard label="Seller Earning" value={`₹${earnings.sellerEarning.toFixed(2)}`} />
                                <StatCard label="Snapit Margin" value={`₹${earnings.snapitMargin.toFixed(2)}`} />
                            </div>
                        )}
                    </>
                )}

                {editingProduct && (
                    <EditProductModal
                        product={editingProduct}
                        onClose={() => setEditingProduct(null)}
                        onSave={saveProduct}
                    />
                )}
            </div>
        );
    }

    return (
        <div className="p-4 max-w-5xl mx-auto">
            <h2 className="text-xl font-bold mb-4">Store Sellers</h2>
            <div className="space-y-2">
                {sellers.map(s => (
                    <div
                        key={s._id}
                        onClick={() => openSeller(s)}
                        className="border rounded-lg p-3 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                    >
                        <div className="flex items-center gap-3">
                            <span className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-sm font-bold">
                                #{s.rank}
                            </span>
                            <div>
                                <p className="font-medium">{s.store_name}</p>
                                <p className="text-xs text-gray-500">{s.name} · {s.email}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-semibold">₹{s.stats.totalRevenue.toFixed(2)}</p>
                            <p className="text-xs text-gray-500">{s.stats.totalOrders} orders</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function StatCard({ label, value }) {
    return (
        <div className="border rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500">{label}</p>
            <p className="text-lg font-bold">{value}</p>
        </div>
    );
}

function EditProductModal({ product, onClose, onSave }) {
    const [form, setForm] = useState({
        name: product.name,
        sellerPrice: product.sellerPrice,
        snapitMargin: product.snapitMargin,
        publish: product.publish,
    });

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-4 w-full max-w-md">
                <h3 className="font-bold mb-3">Edit {product.name}</h3>
                <div className="space-y-2">
                    <input
                        className="w-full border rounded px-2 py-1 text-sm"
                        value={form.name}
                        onChange={e => setForm({ ...form, name: e.target.value })}
                        placeholder="Name"
                    />
                    <input
                        type="number"
                        className="w-full border rounded px-2 py-1 text-sm"
                        value={form.sellerPrice}
                        onChange={e => setForm({ ...form, sellerPrice: Number(e.target.value) })}
                        placeholder="Seller Price"
                    />
                    <input
                        type="number"
                        className="w-full border rounded px-2 py-1 text-sm"
                        value={form.snapitMargin}
                        onChange={e => setForm({ ...form, snapitMargin: Number(e.target.value) })}
                        placeholder="Snapit Margin"
                    />
                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={form.publish}
                            onChange={e => setForm({ ...form, publish: e.target.checked })}
                        />
                        Published
                    </label>
                </div>
                <div className="flex gap-2 mt-4">
                    <button onClick={onClose} className="flex-1 border rounded py-2 text-sm">Cancel</button>
                    <button
                        onClick={() => onSave({ ...product, ...form })}
                        className="flex-1 bg-blue-600 text-white rounded py-2 text-sm"
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
}
