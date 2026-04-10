import { useState, useEffect } from "react";
import {
  Search, Plus, Download, RefreshCcw, ChevronLeft, ChevronRight,
  ArrowUpDown, AlertTriangle, Clock, TrendingUp, Package, Eye, Edit2, Trash2,
  ChevronDown, Loader2
} from "lucide-react";
import * as api from "../lib/api";

const expiryConfig = {
  normal:   { label: "正常",    bg: "#ECFDF5", color: "#059669", border: "#A7F3D0" },
  warning:  { label: "即將到期", bg: "#FFFBEB", color: "#D97706", border: "#FDE68A" },
  critical: { label: "緊急到期", bg: "#FEF2F2", color: "#DC2626", border: "#FECACA" },
  expired:  { label: "已到期",  bg: "#FEF2F2", color: "#7F1D1D", border: "#EF4444" },
};

const PAGE_SIZE = 8;

function SkeletonRow() {
  return (
    <tr style={{ borderBottom: "1px solid #F1F5F9" }}>
      {Array.from({ length: 10 }).map((_, i) => (
        <td key={i} style={{ padding: "14px" }}>
          <div className="rounded animate-pulse" style={{ height: "16px", background: "#E2E8F0", width: i === 0 ? "40px" : i === 1 ? "160px" : "60px" }} />
        </td>
      ))}
    </tr>
  );
}

export function InventoryPage() {
  const [products, setProducts] = useState<api.Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("全部");
  const [statusFilter, setStatusFilter] = useState("全部");
  const [sortKey, setSortKey] = useState<keyof api.Product>("id");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addMode, setAddMode] = useState<"restock" | "new">("restock");
  
  // Data for 'new'
  const [catOptions, setCatOptions] = useState<api.CategoryObj[]>([]);
  const [supOptions, setSupOptions] = useState<api.SupplierObj[]>([]);
  
  // Form states
  const [newProdName, setNewProdName] = useState("");
  const [newProdBarcode, setNewProdBarcode] = useState("");
  const [newProdCat, setNewProdCat] = useState("");
  const [newProdSup, setNewProdSup] = useState("");
  const [newProdPrice, setNewProdPrice] = useState("");
  const [newProdStock, setNewProdStock] = useState("");
  
  // For 'restock'
  const [restockQty, setRestockQty] = useState<{ [id: string]: string }>({});
  const [restockExpiry, setRestockExpiry] = useState<{ [id: string]: string }>({});

  // For 'edit settings'
  const [editingProduct, setEditingProduct] = useState<api.Product | null>(null);
  const [editSafetyStock, setEditSafetyStock] = useState("");
  const [editReorderRules, setEditReorderRules] = useState<{ [key: string]: number }>({});
  const daysOfWeek = [
    { key: "mon", label: "星期一" }, { key: "tue", label: "星期二" },
    { key: "wed", label: "星期三" }, { key: "thu", label: "星期四" },
    { key: "fri", label: "星期五" }, { key: "sat", label: "星期六" },
    { key: "sun", label: "星期日" }
  ];
  
  const loadProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const [res, cats, sups] = await Promise.all([
        api.getProducts(),
        api.getCategories(),
        api.getSuppliers()
      ]);
      setProducts(res.data ?? []);
      setCatOptions(cats.data ?? []);
      setSupOptions(sups.data ?? []);
    } catch (err: any) {
      console.error("Failed to load products:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProducts(); }, []);

  const handleCreateProduct = async () => {
    if(!newProdCat) return alert("請選擇分類！");
    try {
      await api.createProduct({
        name: newProdName,
        barcode: newProdBarcode,
        category_id: newProdCat,
        supplier_id: newProdSup || undefined,
        original_price: Number(newProdPrice),
        stock: Number(newProdStock),
        safety_stock: 10
      });
      setIsAddModalOpen(false);
      loadProducts();
    } catch(err) {
      alert("新增失敗");
    }
  };

  const handleSaveAllRestocks = async () => {
    const promises = [];
    const restockedNames: string[] = [];
    
    for (const [id, qtyStr] of Object.entries(restockQty)) {
      const qty = Number(qtyStr);
      if (qty > 0) {
        const product = products.find(p => p.id === id);
        if (product) {
          const expiry = restockExpiry[id];
          promises.push(
            api.updateProduct(id, {
              stock: product.stock + qty,
              ...(expiry && { expiration_date: expiry })
            })
          );
          restockedNames.push(product.name);
        }
      }
    }
    
    if (promises.length === 0) return alert("請輸入至少一項進貨數量！");
    
    try {
      await Promise.all(promises);
      setRestockQty({});
      setRestockExpiry({});
      loadProducts();
      alert(`已成功批次進貨：\n${restockedNames.join("\n")}`);
      setIsAddModalOpen(false);
    } catch(err) {
      alert("批次進貨發生錯誤，請重試！");
    }
  };

  const handleSaveEdit = async () => {
    if (!editingProduct) return;
    try {
      await api.updateProduct(editingProduct.id, {
        safety_stock: Number(editSafetyStock),
        reorder_rules: editReorderRules
      });
      setEditingProduct(null);
      loadProducts();
      alert("設定儲存成功！");
    } catch (err) {
      alert("儲存失敗");
    }
  };

  const categories = ["全部", ...Array.from(new Set(products.map((p) => p.category)))];
  const statuses = ["全部", "normal", "warning", "critical", "expired"];
  const statusLabels: Record<string, string> = { 全部: "全部狀態", normal: "正常", warning: "即將到期", critical: "緊急到期", expired: "已到期" };

  const filtered = products
    .filter((p) => {
      const matchSearch = !search || p.name.includes(search) || p.barcode.includes(search) || p.category.includes(search);
      const matchCat = categoryFilter === "全部" || p.category === categoryFilter;
      const matchStatus = statusFilter === "全部" || p.expiry_status === statusFilter;
      return matchSearch && matchCat && matchStatus;
    })
    .sort((a, b) => {
      const av = a[sortKey] as string | number;
      const bv = b[sortKey] as string | number;
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleSort = (key: keyof api.Product) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const toggleRow = (id: string) => {
    setSelectedRows((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("確定要刪除此商品？")) return;
    try {
      await api.deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      alert(`刪除失敗：${err.message}`);
    }
  };

  const statsBar = [
    { label: "商品總數", value: products.length, color: "#4F46E5" },
    { label: "低庫存", value: products.filter((p) => p.stock < p.safety_stock).length, color: "#D97706" },
    { label: "即將到期", value: products.filter((p) => p.expiry_status === "warning" || p.expiry_status === "critical").length, color: "#DC2626" },
    { label: "AI 調價中", value: products.filter((p) => p.ai_price_change !== 0).length, color: "#059669" },
  ];

  return (
    <div className="p-6" style={{ background: "#F1F5F9", minHeight: "100%" }}>
      {/* Stats bar */}
      <div className="grid gap-4 mb-5" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        {statsBar.map((s) => (
          <div key={s.label} className="flex items-center gap-3 rounded-xl px-4 py-3 border" style={{ background: "#FFFFFF", borderColor: "#E2E8F0" }}>
            <div className="rounded-lg flex items-center justify-center" style={{ width: "36px", height: "36px", background: `${s.color}15` }}>
              <Package size={18} style={{ color: s.color }} />
            </div>
            <div>
              <div style={{ color: "#1E293B", fontSize: "1.3rem", fontWeight: 700 }}>
                {loading ? <div className="rounded animate-pulse" style={{ width: "30px", height: "28px", background: "#E2E8F0" }} /> : s.value}
              </div>
              <div style={{ color: "#94A3B8", fontSize: "0.72rem" }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2 rounded-xl px-3 border flex-1" style={{ height: "40px", background: "#FFFFFF", borderColor: "#E2E8F0", maxWidth: "320px" }}>
          <Search size={15} style={{ color: "#94A3B8" }} />
          <input
            type="text" value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="搜尋商品名稱、條碼..."
            className="flex-1 border-none outline-none bg-transparent"
            style={{ color: "#1E293B", fontSize: "0.82rem" }}
          />
        </div>

        <div className="relative">
          <select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }} className="rounded-xl border pl-3 pr-8 appearance-none" style={{ height: "40px", background: "#FFFFFF", borderColor: "#E2E8F0", color: "#475569", fontSize: "0.8rem", cursor: "pointer" }}>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#94A3B8" }} />
        </div>

        <div className="relative">
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="rounded-xl border pl-3 pr-8 appearance-none" style={{ height: "40px", background: "#FFFFFF", borderColor: "#E2E8F0", color: "#475569", fontSize: "0.8rem", cursor: "pointer" }}>
            {statuses.map((s) => <option key={s} value={s}>{statusLabels[s]}</option>)}
          </select>
          <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#94A3B8" }} />
        </div>

        <div style={{ flex: 1 }} />

        <button className="flex items-center gap-1.5 rounded-xl px-4 border transition-colors" style={{ height: "40px", background: "#FFFFFF", borderColor: "#E2E8F0", color: "#64748B", fontSize: "0.8rem", cursor: "pointer" }}>
          <Download size={14} /> 匯出
        </button>
        <button onClick={loadProducts} disabled={loading} className="flex items-center gap-1.5 rounded-xl px-4 border transition-colors" style={{ height: "40px", background: "#FFFFFF", borderColor: "#E2E8F0", color: "#64748B", fontSize: "0.8rem", cursor: "pointer" }}>
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />} 同步
        </button>
        <button onClick={() => {
          setAddMode("restock");
          setIsAddModalOpen(true);
        }} className="flex items-center gap-1.5 rounded-xl px-4 transition-colors" style={{ height: "40px", background: "linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)", color: "#FFFFFF", border: "none", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600, boxShadow: "0 2px 8px rgba(79,70,229,0.25)" }}>
          <Plus size={14} /> 新增/進貨
        </button>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl border" style={{ background: "#FEF2F2", borderColor: "#FECACA", color: "#DC2626", fontSize: "0.82rem" }}>
          ⚠ 載入失敗：{error}
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border overflow-hidden" style={{ background: "#FFFFFF", borderColor: "#E2E8F0", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <div className="overflow-x-auto">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
                <th style={{ padding: "12px 16px", width: "40px" }}>
                  <input type="checkbox" style={{ accentColor: "#4F46E5" }} onChange={(e) => { if (e.target.checked) setSelectedRows(new Set(paged.map((p) => p.id))); else setSelectedRows(new Set()); }} />
                </th>
                {[
                  { key: "name", label: "商品名稱 / 條碼", sortable: true },
                  { key: "category", label: "類別", sortable: true },
                  { key: "original_price", label: "原價", sortable: true },
                  { key: "ai_price", label: "AI 動態價格", sortable: true },
                  { key: "stock", label: "庫存量", sortable: true },
                  { key: "safety_stock", label: "安全閾值", sortable: false },
                  { key: "expiry_status", label: "效期狀態", sortable: true },
                  { key: "supplier", label: "供應商", sortable: false },
                  { key: "actions", label: "操作", sortable: false },
                ].map((col) => (
                  <th key={col.key} onClick={() => col.sortable && toggleSort(col.key as keyof api.Product)} style={{ padding: "10px 14px", textAlign: "left", color: "#64748B", fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", cursor: col.sortable ? "pointer" : "default", whiteSpace: "nowrap" }}>
                    <div className="flex items-center gap-1">
                      {col.label}
                      {col.sortable && <ArrowUpDown size={11} style={{ color: sortKey === col.key ? "#4F46E5" : "#CBD5E1" }} />}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
                : paged.map((product, idx) => {
                    const expConfig = expiryConfig[product.expiry_status];
                    const isLowStock = product.stock < product.safety_stock;
                    const isSelected = selectedRows.has(product.id);
                    const priceUp = product.ai_price_change > 0;
                    const priceDown = product.ai_price_change < 0;
                    return (
                      <tr key={product.id} style={{ background: isSelected ? "#EEF2FF" : idx % 2 === 0 ? "#FFFFFF" : "#FAFAFA", borderBottom: "1px solid #F1F5F9", transition: "background 0.1s" }} onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = "#F8FAFC"; }} onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = idx % 2 === 0 ? "#FFFFFF" : "#FAFAFA"; }}>
                        <td style={{ padding: "12px 16px" }}>
                          <input type="checkbox" checked={isSelected} onChange={() => toggleRow(product.id)} style={{ accentColor: "#4F46E5" }} />
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center rounded-lg flex-shrink-0" style={{ width: "34px", height: "34px", background: "#F8FAFC", fontSize: "1.1rem", border: "1px solid #E2E8F0" }}>{product.image}</div>
                            <div>
                              <div style={{ color: "#1E293B", fontSize: "0.82rem", fontWeight: 600 }}>{product.name}</div>
                              <div style={{ color: "#94A3B8", fontSize: "0.68rem", fontFamily: "monospace" }}>{product.barcode}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <span className="px-2 py-0.5 rounded-full" style={{ background: "#F1F5F9", color: "#475569", fontSize: "0.72rem", fontWeight: 500 }}>{product.category}</span>
                        </td>
                        <td style={{ padding: "12px 14px", color: "#64748B", fontSize: "0.82rem" }}>NT${product.original_price}</td>
                        <td style={{ padding: "12px 14px" }}>
                          <div className="flex items-center gap-1.5">
                            <span style={{ color: priceDown ? "#DC2626" : priceUp ? "#059669" : "#1E293B", fontSize: "0.85rem", fontWeight: 700 }}>NT${product.ai_price}</span>
                            {product.ai_price_change !== 0 && (
                              <span className="flex items-center gap-0.5 px-1.5 rounded-full" style={{ background: priceDown ? "#FEF2F2" : "#ECFDF5", color: priceDown ? "#DC2626" : "#059669", fontSize: "0.65rem", fontWeight: 700 }}>
                                <TrendingUp size={9} style={{ transform: priceDown ? "scaleY(-1)" : "none" }} />
                                {Math.abs(product.ai_price_change).toFixed(0)}%
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <div className="flex items-center gap-2">
                            <span style={{ color: isLowStock ? "#DC2626" : "#1E293B", fontWeight: isLowStock ? 700 : 500, fontSize: "0.85rem" }}>{product.stock}</span>
                            {isLowStock && <AlertTriangle size={13} style={{ color: "#D97706" }} />}
                            <div className="rounded-full overflow-hidden" style={{ width: "40px", height: "4px", background: "#F1F5F9" }}>
                              <div className="rounded-full" style={{ height: "100%", width: `${Math.min(100, (product.stock / (product.safety_stock * 2)) * 100)}%`, background: isLowStock ? "#EF4444" : "#4F46E5" }} />
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "12px 14px", color: "#94A3B8", fontSize: "0.82rem" }}>{product.safety_stock}</td>
                        <td style={{ padding: "12px 14px" }}>
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full w-fit" style={{ background: expConfig.bg, color: expConfig.color, border: `1px solid ${expConfig.border}`, fontSize: "0.7rem", fontWeight: 600, whiteSpace: "nowrap" }}>
                            {product.expiry_status !== "normal" && <Clock size={10} />}
                            {expConfig.label}
                          </span>
                          <div style={{ color: "#94A3B8", fontSize: "0.65rem", marginTop: "2px" }}>{product.expiry_date}</div>
                        </td>
                        <td style={{ padding: "12px 14px", color: "#64748B", fontSize: "0.78rem" }}>{product.supplier}</td>
                        <td style={{ padding: "12px 14px" }}>
                          <div className="flex items-center gap-1">
                            <button className="flex items-center justify-center rounded-lg transition-colors" style={{ width: "28px", height: "28px", background: "#F8FAFC", border: "1px solid #E2E8F0", color: "#64748B", cursor: "pointer" }} title="查看詳情"><Eye size={13} /></button>
                            <button 
                              onClick={() => {
                                setEditingProduct(product);
                                setEditSafetyStock(String(product.safety_stock));
                                setEditReorderRules(product.reorder_rules || {});
                              }}
                              className="flex items-center justify-center rounded-lg transition-colors" style={{ width: "28px", height: "28px", background: "#F8FAFC", border: "1px solid #E2E8F0", color: "#64748B", cursor: "pointer" }} title="設定與編輯">
                              <Edit2 size={13} />
                            </button>
                            <button onClick={() => handleDelete(product.id)} className="flex items-center justify-center rounded-lg transition-colors" style={{ width: "28px", height: "28px", background: "#FEF2F2", border: "1px solid #FECACA", color: "#DC2626", cursor: "pointer" }} title="刪除"><Trash2 size={13} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-t" style={{ borderColor: "#E2E8F0", background: "#FAFAFA" }}>
          <div style={{ color: "#64748B", fontSize: "0.78rem" }}>
            {loading ? "載入中..." : `顯示 ${filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)} / 共 ${filtered.length} 筆`}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="flex items-center justify-center rounded-lg border transition-colors" style={{ width: "32px", height: "32px", background: page === 1 ? "#F8FAFC" : "#FFFFFF", borderColor: "#E2E8F0", color: page === 1 ? "#CBD5E1" : "#64748B", cursor: page === 1 ? "not-allowed" : "pointer" }}>
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button key={p} onClick={() => setPage(p)} className="flex items-center justify-center rounded-lg border transition-colors" style={{ width: "32px", height: "32px", background: p === page ? "#4F46E5" : "#FFFFFF", borderColor: p === page ? "#4F46E5" : "#E2E8F0", color: p === page ? "#FFFFFF" : "#64748B", cursor: "pointer", fontWeight: p === page ? 700 : 400, fontSize: "0.8rem" }}>
                {p}
              </button>
            ))}
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="flex items-center justify-center rounded-lg border transition-colors" style={{ width: "32px", height: "32px", background: page === totalPages ? "#F8FAFC" : "#FFFFFF", borderColor: "#E2E8F0", color: page === totalPages ? "#CBD5E1" : "#64748B", cursor: page === totalPages ? "not-allowed" : "pointer" }}>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl rounded-2xl shadow-xl flex flex-col" style={{ background: "#FFFFFF", maxHeight: "90vh" }}>
            <div className="flex border-b" style={{ borderColor: "#E2E8F0" }}>
              <button 
                onClick={() => setAddMode("restock")} 
                className="flex-1 py-4 text-center font-bold text-sm transition-colors" 
                style={{ color: addMode === "restock" ? "#4F46E5" : "#64748B", borderBottom: addMode === "restock" ? "3px solid #4F46E5" : "none" }}>
                現有商品進貨
              </button>
              <button 
                onClick={() => setAddMode("new")} 
                className="flex-1 py-4 text-center font-bold text-sm transition-colors" 
                style={{ color: addMode === "new" ? "#4F46E5" : "#64748B", borderBottom: addMode === "new" ? "3px solid #4F46E5" : "none" }}>
                建立全新商品
              </button>
              <button onClick={() => setIsAddModalOpen(false)} className="px-4 hover:bg-slate-50 transition-colors" style={{ color: "#94A3B8" }}>
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {addMode === "restock" ? (
                <div>
                  <p className="text-sm font-semibold mb-4" style={{color: "#1E293B"}}>選擇資料庫中現有的商品，直接輸入件數進貨：</p>
                  <div className="flex flex-col gap-6">
                    {categories.filter(c => c !== "全部").map(cat => {
                      const prods = products.filter(p => p.category === cat);
                      if(prods.length === 0) return null;
                      return (
                        <div key={cat} className="border rounded-xl p-4 shadow-sm" style={{borderColor: "#E2E8F0"}}>
                          <h3 className="text-sm font-bold mb-3 border-b pb-2" style={{color: "#4F46E5", borderColor: "#F1F5F9"}}>{cat}</h3>
                          <div className="grid gap-2" style={{gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))"}}>
                            {prods.map(p => (
                              <div key={p.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-colors">
                                <div className="flex items-center gap-2">
                                  <div className="text-lg">{p.image}</div>
                                  <div>
                                    <div className="text-xs font-bold" style={{color: "#1E293B"}}>{p.name}</div>
                                    <div className="text-[10px]" style={{color: "#94A3B8"}}>現有庫存：{p.stock}</div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  <input 
                                    type="date"
                                    value={restockExpiry[p.id] || ""}
                                    onChange={(e) => setRestockExpiry({...restockExpiry, [p.id]: e.target.value})}
                                    className="border rounded px-2 text-xs" 
                                    style={{height: "30px", borderColor: "#CBD5E1", width: "110px", color: "#475569"}}
                                  />
                                  <input 
                                    type="number" 
                                    placeholder="數量" 
                                    value={restockQty[p.id] || ""}
                                    onChange={(e) => setRestockQty({...restockQty, [p.id]: e.target.value})}
                                    className="border rounded px-2 w-14 text-xs text-center" 
                                    style={{height: "30px", borderColor: "#CBD5E1"}} 
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-end mt-6 pt-4 border-t sticky bottom-0 bg-white" style={{ borderColor: "#E2E8F0" }}>
                    <button onClick={handleSaveAllRestocks} className="px-6 py-2.5 rounded-lg text-sm font-bold text-white transition-colors" style={{ background: "#10B981" }}>
                      ✓ 確認並儲存所有進貨
                    </button>
                  </div>
                </div>
              ) : (
                 <div className="flex flex-col gap-4 max-w-lg mx-auto py-4">
                   <div>
                     <label className="text-xs font-bold text-slate-500 mb-1 block">商品名稱</label>
                     <input type="text" value={newProdName} onChange={e => setNewProdName(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
                   </div>
                   <div>
                     <label className="text-xs font-bold text-slate-500 mb-1 block">商品條碼</label>
                     <input type="text" value={newProdBarcode} onChange={e => setNewProdBarcode(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="text-xs font-bold text-slate-500 mb-1 block">分類</label>
                       <select value={newProdCat} onChange={e => setNewProdCat(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm bg-white">
                         <option value="">請選擇...</option>
                         {catOptions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                       </select>
                     </div>
                     <div>
                       <label className="text-xs font-bold text-slate-500 mb-1 block">供應商</label>
                       <select value={newProdSup} onChange={e => setNewProdSup(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm bg-white">
                         <option value="">請選擇...</option>
                         {supOptions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                       </select>
                     </div>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="text-xs font-bold text-slate-500 mb-1 block">原價 (NT$)</label>
                       <input type="number" value={newProdPrice} onChange={e => setNewProdPrice(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
                     </div>
                     <div>
                       <label className="text-xs font-bold text-slate-500 mb-1 block">初始庫存</label>
                       <input type="number" value={newProdStock} onChange={e => setNewProdStock(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
                     </div>
                   </div>
                   <button onClick={handleCreateProduct} className="mt-4 w-full rounded-lg py-3 text-sm font-bold text-white transition-transform active:scale-95" style={{background: "linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)"}}>
                     🚀 建立全新庫存商品
                   </button>
                 </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Settings Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl shadow-xl flex flex-col" style={{ background: "#FFFFFF" }}>
            <div className="px-6 py-4 flex items-center justify-between border-b" style={{ borderColor: "#E2E8F0" }}>
              <div>
                <h2 className="text-base font-bold text-slate-800">庫存叫貨與警示設定</h2>
                <div className="text-xs text-slate-500 mt-1">{editingProduct.name} ({editingProduct.barcode})</div>
              </div>
              <button onClick={() => setEditingProduct(null)} className="p-1 rounded-full hover:bg-slate-100 transition-colors">
                <Trash2 size={16} className="opacity-0 pointer-events-none" /> {/* Placeholder for alignment if needed, or just X */}
                <span className="text-slate-400 absolute right-6 top-6 cursor-pointer">✕</span>
              </button>
            </div>
            
            <div className="px-6 py-5 overflow-y-auto" style={{ maxHeight: "70vh" }}>
              <div className="mb-5">
                <label className="text-sm font-bold text-slate-700 mb-2 block">安全庫存警示量</label>
                <div className="flex items-center gap-2">
                  <AlertTriangle size={16} className="text-amber-500" />
                  <input type="number" value={editSafetyStock} onChange={(e) => setEditSafetyStock(e.target.value)} className="border rounded-lg px-3 py-2 text-sm w-full" style={{ borderColor: "#CBD5E1" }} />
                </div>
                <p className="text-xs text-slate-500 mt-1">當現有庫存低於此數值，系統將會發出補貨警告。</p>
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700 mb-2 block flex items-center gap-1.5"><Clock size={16} className="text-indigo-500" /> 週期叫貨上限基準</label>
                <p className="text-xs text-slate-500 mb-3">請依照一週內各天的銷售節奏，設定每一天的最高拉貨量：</p>
                
                <div className="grid gap-2">
                  {daysOfWeek.map(day => (
                    <div key={day.key} className="flex items-center justify-between rounded-lg p-2 border" style={{ borderColor: "#F1F5F9", background: "#FAFAFA" }}>
                      <span className="text-sm font-semibold text-slate-600">{day.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">上限數量</span>
                        <input 
                          type="number" 
                          value={editReorderRules[day.key] ?? ""} 
                          onChange={(e) => setEditReorderRules({...editReorderRules, [day.key]: Number(e.target.value)})}
                          className="border rounded text-sm px-2 py-1 w-16 text-center" 
                          style={{ borderColor: "#CBD5E1", color: "#1E293B" }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t rounded-b-2xl flex justify-end gap-2" style={{ borderColor: "#E2E8F0" }}>
              <button onClick={() => setEditingProduct(null)} className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-200 transition-colors">
                取消
              </button>
              <button onClick={handleSaveEdit} className="px-4 py-2 rounded-lg text-sm font-bold text-white transition-colors" style={{ background: "#4F46E5" }}>
                儲存設定
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
