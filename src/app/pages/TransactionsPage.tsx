import { useState, useEffect } from "react";
import { Receipt, Search, Filter, Eye, X, Calendar, User, CreditCard, Banknote, Smartphone } from "lucide-react";
import * as api from "../lib/api";

const paymentIconAndLabel = (method: string) => {
  if (method === "cash" || method === "現金") return { icon: <Banknote size={14} />, label: "現金", color: "#10B981" };
  if (method === "card" || method === "信用卡") return { icon: <CreditCard size={14} />, label: "信用卡", color: "#3B82F6" };
  if (method === "easycard" || method === "悠遊卡") return { icon: <Smartphone size={14} />, label: "悠遊卡", color: "#F59E0B" };
  if (method === "linepay" || method === "Line Pay") return { icon: <Smartphone size={14} />, label: "Line Pay", color: "#14B8A6" };
  return { icon: <CreditCard size={14} />, label: method, color: "#64748B" };
};

export function TransactionsPage() {
  const [transactions, setTransactions] = useState<api.Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTx, setSelectedTx] = useState<api.Transaction | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data } = await api.getTransactions();
      setTransactions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = transactions.filter((t) =>
    t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.cashier.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 h-full flex flex-col" style={{ background: "#F1F5F9" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: "#1E293B" }}>
            <Receipt size={24} style={{ color: "#4F46E5" }} />
            交易明細與收據
          </h1>
          <p className="text-sm mt-1" style={{ color: "#64748B" }}>檢視所有 POS 機結帳歷史紀錄與單據明細</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2 rounded-lg border px-3 flex-1 max-w-sm" style={{ height: "42px", background: "#FFFFFF", borderColor: "#E2E8F0" }}>
          <Search size={16} style={{ color: "#94A3B8" }} />
          <input
            type="text"
            placeholder="搜尋單號或結帳人員..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border-none outline-none flex-1 text-sm bg-transparent"
            style={{ color: "#1E293B" }}
          />
        </div>
      </div>

      {/* Table Card */}
      <div className="flex-1 rounded-xl border flex flex-col relative" style={{ background: "#FFFFFF", borderColor: "#E2E8F0", overflow: "hidden" }}>
        <div className="overflow-x-auto flex-1 h-full">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="sticky top-0 bg-white" style={{ zIndex: 10 }}>
              <tr style={{ borderBottom: "1px solid #E2E8F0" }}>
                <th className="py-3 px-4 text-xs font-semibold whitespace-nowrap" style={{ color: "#64748B" }}>交易單號</th>
                <th className="py-3 px-4 text-xs font-semibold whitespace-nowrap" style={{ color: "#64748B" }}>時間</th>
                <th className="py-3 px-4 text-xs font-semibold whitespace-nowrap" style={{ color: "#64748B" }}>銷售總額</th>
                <th className="py-3 px-4 text-xs font-semibold whitespace-nowrap" style={{ color: "#64748B" }}>件數</th>
                <th className="py-3 px-4 text-xs font-semibold whitespace-nowrap" style={{ color: "#64748B" }}>付款方式</th>
                <th className="py-3 px-4 text-xs font-semibold whitespace-nowrap" style={{ color: "#64748B" }}>結帳人員</th>
                <th className="py-3 px-4 text-xs font-semibold whitespace-nowrap text-right" style={{ color: "#64748B" }}>明細</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #F1F5F9" }} className="animate-pulse">
                    <td className="py-4 px-4"><div className="h-4 w-24 bg-gray-200 rounded"></div></td>
                    <td className="py-4 px-4"><div className="h-4 w-32 bg-gray-200 rounded"></div></td>
                    <td className="py-4 px-4"><div className="h-4 w-16 bg-gray-200 rounded"></div></td>
                    <td className="py-4 px-4"><div className="h-4 w-8 bg-gray-200 rounded"></div></td>
                    <td className="py-4 px-4"><div className="h-4 w-20 bg-gray-200 rounded"></div></td>
                    <td className="py-4 px-4"><div className="h-4 w-16 bg-gray-200 rounded"></div></td>
                    <td className="py-4 px-4 text-right"><div className="h-6 w-16 bg-gray-200 rounded ml-auto"></div></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-sm" style={{ color: "#64748B" }}>
                    尚無任何交易紀錄
                  </td>
                </tr>
              ) : (
                filtered.map((tx) => {
                  const pm = paymentIconAndLabel(tx.payment_method);
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50 transition-colors cursor-pointer" style={{ borderBottom: "1px solid #F1F5F9" }} onClick={() => setSelectedTx(tx)}>
                      <td className="py-3 px-4 text-xs font-medium" style={{ color: "#1E293B" }}>#{tx.id.substring(0, 8).toUpperCase()}</td>
                      <td className="py-3 px-4 text-xs whitespace-nowrap" style={{ color: "#475569" }}>
                        <div className="flex items-center gap-1.5"><Calendar size={13} style={{ color: "#94A3B8" }} /> {new Date(tx.created_at).toLocaleString()}</div>
                      </td>
                      <td className="py-3 px-4 text-sm font-bold whitespace-nowrap" style={{ color: "#1E293B" }}>NT${tx.total.toLocaleString()}</td>
                      <td className="py-3 px-4 text-xs whitespace-nowrap" style={{ color: "#64748B" }}>{tx.items_count} 件</td>
                      <td className="py-3 px-4 text-xs whitespace-nowrap">
                        <span className="flex items-center gap-1.5 w-max px-2 py-1 rounded-md bg-opacity-10" style={{ color: pm.color, backgroundColor: `${pm.color}15` }}>
                          {pm.icon} {pm.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs whitespace-nowrap" style={{ color: "#475569" }}>
                        <div className="flex items-center gap-1.5"><User size={13} style={{ color: "#94A3B8" }} /> {tx.cashier}</div>
                      </td>
                      <td className="py-3 px-4 text-right pr-6">
                        <button className="rounded px-2.5 py-1 text-xs font-semibold transition-colors" style={{ color: "#4F46E5", background: "#EEF2FF" }}>
                          檢視
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Overlay */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl rounded-2xl shadow-xl flex flex-col" style={{ background: "#FFFFFF", maxHeight: "90vh" }}>
            {/* Modal Header */}
            <div className="px-6 py-4 flex items-center justify-between border-b" style={{ borderColor: "#E2E8F0" }}>
              <div className="flex items-center gap-2">
                <Receipt size={18} style={{ color: "#4F46E5" }} />
                <h2 className="text-sm font-bold" style={{ color: "#1E293B" }}>收據明細 #{selectedTx.id.substring(0, 8).toUpperCase()}</h2>
              </div>
              <button onClick={() => setSelectedTx(null)} className="p-1 rounded-full hover:bg-slate-100 transition-colors">
                <X size={18} style={{ color: "#64748B" }} />
              </button>
            </div>

            {/* Modal Scroll Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="text-xs font-semibold mb-1" style={{ color: "#64748B" }}>交易時間</div>
                  <div className="text-sm" style={{ color: "#1E293B" }}>{new Date(selectedTx.created_at).toLocaleString()}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-semibold mb-1" style={{ color: "#64748B" }}>結帳人員</div>
                  <div className="text-sm" style={{ color: "#1E293B" }}>{selectedTx.cashier}</div>
                </div>
              </div>

              <div className="text-xs font-bold uppercase mb-2" style={{ color: "#94A3B8" }}>購買商品清單</div>
              <div className="border rounded-xl mb-4" style={{ borderColor: "#E2E8F0" }}>
                {selectedTx.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center px-4 py-3 border-b last:border-b-0" style={{ borderColor: "#F1F5F9" }}>
                    <div>
                      <div className="text-sm font-semibold" style={{ color: "#1E293B" }}>{item.name}</div>
                      <div className="text-xs mt-0.5" style={{ color: "#64748B" }}>NT${item.price.toLocaleString()} × {item.qty}</div>
                    </div>
                    <div className="text-sm font-bold" style={{ color: "#1E293B" }}>
                      NT${(item.price * item.qty).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer Summary */}
            <div className="px-6 py-4 bg-slate-50 border-t rounded-b-2xl" style={{ borderColor: "#E2E8F0" }}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm" style={{ color: "#64748B" }}>付款方式</span>
                <span className="text-sm font-semibold flex items-center gap-1" style={{ color: "#1E293B" }}>
                  {paymentIconAndLabel(selectedTx.payment_method).icon} {paymentIconAndLabel(selectedTx.payment_method).label}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold" style={{ color: "#475569" }}>總計金額</span>
                <span className="text-xl font-black" style={{ color: "#4F46E5" }}>NT${selectedTx.total.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
