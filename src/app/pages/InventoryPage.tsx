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

  const loadProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getProducts();
      setProducts(res.data ?? []);
    } catch (err: any) {
      console.error("Failed to load products:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProducts(); }, []);

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
        <button className="flex items-center gap-1.5 rounded-xl px-4 transition-colors" style={{ height: "40px", background: "linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)", color: "#FFFFFF", border: "none", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600, boxShadow: "0 2px 8px rgba(79,70,229,0.25)" }}>
          <Plus size={14} /> 新增商品
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
                            <button className="flex items-center justify-center rounded-lg transition-colors" style={{ width: "28px", height: "28px", background: "#F8FAFC", border: "1px solid #E2E8F0", color: "#64748B", cursor: "pointer" }} title="編輯"><Edit2 size={13} /></button>
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
    </div>
  );
}
