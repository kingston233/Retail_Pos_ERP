import { useState, useRef, useEffect } from "react";
import {
  Search, Barcode, Plus, Minus, Trash2, ShoppingCart,
  CreditCard, Banknote, Smartphone, Tag, CheckCircle,
  Zap, ChevronDown, Receipt, Loader2
} from "lucide-react";
import * as api from "../lib/api";

interface CartItem {
  id: string;
  name: string;
  barcode: string;
  price: number;
  aiPrice?: number;
  aiDiscount?: string;
  qty: number;
  category: string;
}

const paymentMethods = [
  { id: "cash", label: "現金", icon: Banknote },
  { id: "card", label: "信用卡", icon: CreditCard },
  { id: "easycard", label: "悠遊卡", icon: Smartphone },
  { id: "linepay", label: "Line Pay", icon: Smartphone },
];

const paymentLabels: Record<string, string> = { cash: "現金", card: "信用卡", easycard: "悠遊卡", linepay: "Line Pay" };

export function POSPage() {
  const [productCatalog, setProductCatalog] = useState<CartItem[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("全部");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [cashReceived, setCashReceived] = useState("");
  const [checkoutDone, setCheckoutDone] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const barcodeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadProducts = async () => {
      setLoadingProducts(true);
      try {
        const res = await api.getProducts();
        const catalog: CartItem[] = (res.data ?? []).map((p) => ({
          id: p.id,
          name: p.name,
          barcode: p.barcode,
          price: p.original_price,
          aiPrice: p.ai_price_change !== 0 ? p.ai_price : undefined,
          aiDiscount: p.ai_price_change < 0 ? `${(100 + p.ai_price_change).toFixed(0)}折` : p.ai_price_change > 0 ? `+${p.ai_price_change.toFixed(0)}%` : undefined,
          qty: 0,
          category: p.category,
        }));
        setProductCatalog(catalog);
      } catch (err) {
        console.error("Failed to load products:", err);
      } finally {
        setLoadingProducts(false);
      }
    };
    loadProducts();
  }, []);

  const quickCategories = ["全部", ...Array.from(new Set(productCatalog.map((p) => p.category)))];

  const filteredProducts = productCatalog.filter((p) => {
    const matchSearch = !search || p.name.includes(search) || p.barcode.includes(search);
    const matchCat = selectedCategory === "全部" || p.category === selectedCategory;
    return matchSearch && matchCat;
  });

  const addToCart = (product: CartItem) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) return prev.map((i) => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) => prev.map((i) => i.id === id ? { ...i, qty: i.qty + delta } : i).filter((i) => i.qty > 0));
  };

  const removeItem = (id: string) => setCart((prev) => prev.filter((i) => i.id !== id));

  const subtotal = cart.reduce((sum, item) => sum + (item.aiPrice ?? item.price) * item.qty, 0);
  const discount = cart.reduce((sum, item) => item.aiPrice ? sum + (item.price - item.aiPrice) * item.qty : sum, 0);
  const total = subtotal;
  const received = parseFloat(cashReceived) || 0;
  const change = received - total;

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setCheckingOut(true);
    try {
      await api.createTransaction({
        cashier: "王小玲",
        total,
        payment_method: paymentLabels[paymentMethod] ?? paymentMethod,
        items_count: cart.reduce((s, i) => s + i.qty, 0),
        items: cart.map((i) => ({ product_id: i.id, name: i.name, qty: i.qty, price: i.aiPrice ?? i.price })),
      });
      setCheckoutDone(true);
      setTimeout(() => {
        setCheckoutDone(false);
        setCart([]);
        setCashReceived("");
        setCheckingOut(false);
      }, 2500);
    } catch (err) {
      console.error("Checkout failed:", err);
      setCheckingOut(false);
    }
  };

  if (checkoutDone) {
    return (
      <div className="flex items-center justify-center h-full" style={{ background: "#F1F5F9" }}>
        <div className="text-center">
          <div className="flex items-center justify-center rounded-full mx-auto mb-4" style={{ width: "80px", height: "80px", background: "#ECFDF5" }}>
            <CheckCircle size={40} style={{ color: "#059669" }} />
          </div>
          <h2 style={{ color: "#1E293B", fontSize: "1.5rem", fontWeight: 700, marginBottom: "8px" }}>結帳成功！</h2>
          <p style={{ color: "#64748B", fontSize: "0.9rem" }}>交易金額：<strong style={{ color: "#059669" }}>NT${total.toLocaleString()}</strong></p>
          {paymentMethod === "cash" && change >= 0 && (
            <p style={{ color: "#64748B", fontSize: "0.9rem" }}>找零：<strong style={{ color: "#4F46E5" }}>NT${change.toLocaleString()}</strong></p>
          )}
          <p style={{ color: "#94A3B8", fontSize: "0.78rem", marginTop: "8px" }}>正在列印收據...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full" style={{ background: "#F1F5F9", overflow: "hidden" }}>
      {/* Left: Product Search + Grid */}
      <div className="flex flex-col flex-1 min-w-0 p-4" style={{ overflow: "hidden" }}>
        {/* Scan / Search Bar */}
        <div className="flex gap-3 mb-3">
          <div className="flex items-center gap-2 rounded-xl px-4 border flex-1" style={{ height: "46px", background: "#FFFFFF", borderColor: "#E2E8F0" }}>
            <Barcode size={18} style={{ color: "#94A3B8" }} />
            <input
              ref={barcodeRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="掃描條碼或輸入商品名稱搜尋..."
              className="flex-1 border-none outline-none bg-transparent"
              style={{ color: "#1E293B", fontSize: "0.88rem" }}
            />
            {search && <button onClick={() => setSearch("")} style={{ color: "#94A3B8", background: "none", border: "none", cursor: "pointer" }}>✕</button>}
          </div>
          <button
            className="flex items-center gap-2 rounded-xl px-4 border transition-all"
            style={{ height: "46px", background: scanning ? "#EEF2FF" : "#FFFFFF", borderColor: scanning ? "#4F46E5" : "#E2E8F0", color: scanning ? "#4F46E5" : "#64748B", cursor: "pointer", fontSize: "0.82rem", fontWeight: 500 }}
            onClick={() => setScanning(!scanning)}
          >
            <Zap size={15} />
            {scanning ? "掃描中..." : "啟用掃描"}
          </button>
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
          {quickCategories.map((cat) => (
            <button key={cat} onClick={() => setSelectedCategory(cat)} className="rounded-lg px-3 whitespace-nowrap transition-all" style={{ height: "30px", fontSize: "0.75rem", fontWeight: selectedCategory === cat ? 600 : 400, background: selectedCategory === cat ? "#4F46E5" : "#FFFFFF", color: selectedCategory === cat ? "#FFFFFF" : "#64748B", border: `1px solid ${selectedCategory === cat ? "#4F46E5" : "#E2E8F0"}`, cursor: "pointer" }}>
              {cat}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        {loadingProducts
          ? (
            <div className="grid gap-2 overflow-y-auto flex-1" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", alignContent: "start" }}>
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="rounded-xl p-3 border animate-pulse" style={{ background: "#FFFFFF", borderColor: "#E2E8F0", height: "100px" }}>
                  <div className="rounded-lg mb-2" style={{ width: "36px", height: "36px", background: "#E2E8F0" }} />
                  <div className="rounded mb-1" style={{ height: "12px", width: "80%", background: "#E2E8F0" }} />
                  <div className="rounded" style={{ height: "14px", width: "40%", background: "#E2E8F0" }} />
                </div>
              ))}
            </div>
          )
          : (
            <div className="grid gap-2 overflow-y-auto flex-1" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", alignContent: "start" }}>
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="rounded-xl p-3 border text-left transition-all"
                  style={{ background: "#FFFFFF", borderColor: "#E2E8F0", cursor: "pointer", position: "relative", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#4F46E5"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(79,70,229,0.12)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#E2E8F0"; e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)"; }}
                >
                  {product.aiDiscount && (
                    <span className="absolute top-2 right-2 px-1.5 rounded-full" style={{ background: "#FEF2F2", color: "#DC2626", fontSize: "0.6rem", fontWeight: 700, border: "1px solid #FECACA" }}>
                      {product.aiDiscount}
                    </span>
                  )}
                  <div className="flex items-center justify-center rounded-lg mb-2" style={{ width: "36px", height: "36px", background: "#F8FAFC", fontSize: "1.2rem" }}>
                    {product.category === "飲料" ? "🥤" : product.category === "零食" ? "🍿" : product.category === "熟食" ? "🍱" : product.category === "輕食" ? "🍙" : product.category === "乳製品" ? "🥛" : product.category === "甜點" ? "🍮" : product.category === "保養" ? "✨" : "📦"}
                  </div>
                  <div style={{ color: "#1E293B", fontSize: "0.75rem", fontWeight: 600, lineHeight: 1.3, marginBottom: "4px" }}>{product.name}</div>
                  <div>
                    {product.aiPrice ? (
                      <div>
                        <span style={{ color: "#DC2626", fontSize: "0.85rem", fontWeight: 700 }}>NT${product.aiPrice}</span>
                        <span style={{ color: "#94A3B8", fontSize: "0.68rem", textDecoration: "line-through", marginLeft: "4px" }}>{product.price}</span>
                      </div>
                    ) : (
                      <span style={{ color: "#1E293B", fontSize: "0.85rem", fontWeight: 700 }}>NT${product.price}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
      </div>

      {/* Right: Cart + Checkout */}
      <div
        className="flex flex-col border-l"
        style={{
          width: "380px",
          flexShrink: 0,
          background: "#FFFFFF",
          borderColor: "#E2E8F0",
          overflow: "hidden",
        }}
      >
        {/* Cart header */}
        <div
          className="flex items-center justify-between px-5 py-3 border-b"
          style={{ borderColor: "#E2E8F0" }}
        >
          <div className="flex items-center gap-2">
            <ShoppingCart size={17} style={{ color: "#4F46E5" }} />
            <span style={{ color: "#1E293B", fontWeight: 700, fontSize: "0.92rem" }}>購物車</span>
            <span
              className="flex items-center justify-center rounded-full"
              style={{
                width: "20px",
                height: "20px",
                background: "#4F46E5",
                color: "#FFFFFF",
                fontSize: "0.65rem",
                fontWeight: 700,
              }}
            >
              {cart.reduce((s, i) => s + i.qty, 0)}
            </span>
          </div>
          {cart.length > 0 && (
            <button
              onClick={() => setCart([])}
              style={{ color: "#DC2626", fontSize: "0.75rem", background: "none", border: "none", cursor: "pointer" }}
            >
              清空
            </button>
          )}
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto px-4 py-2">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <ShoppingCart size={40} style={{ color: "#E2E8F0", marginBottom: "12px" }} />
              <p style={{ color: "#94A3B8", fontSize: "0.85rem" }}>購物車是空的</p>
              <p style={{ color: "#CBD5E1", fontSize: "0.75rem" }}>點擊商品或掃描條碼加入</p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.id}
                className="py-3 border-b"
                style={{ borderColor: "#F8FAFC" }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 pr-2">
                    <div style={{ color: "#1E293B", fontSize: "0.8rem", fontWeight: 600, lineHeight: 1.3 }}>
                      {item.name}
                    </div>
                    {item.aiDiscount && (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Tag size={10} style={{ color: "#DC2626" }} />
                        <span style={{ color: "#DC2626", fontSize: "0.65rem", fontWeight: 700 }}>
                          AI 動態折扣 {item.aiDiscount}
                        </span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="transition-colors"
                    style={{ color: "#CBD5E1", background: "none", border: "none", cursor: "pointer", padding: "2px" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#DC2626")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "#CBD5E1")}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  {/* Qty control */}
                  <div
                    className="flex items-center gap-2 rounded-lg"
                    style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", padding: "3px" }}
                  >
                    <button
                      onClick={() => updateQty(item.id, -1)}
                      className="flex items-center justify-center rounded"
                      style={{ width: "22px", height: "22px", background: "#E2E8F0", border: "none", cursor: "pointer", color: "#64748B" }}
                    >
                      <Minus size={11} />
                    </button>
                    <span style={{ color: "#1E293B", fontSize: "0.82rem", fontWeight: 700, minWidth: "18px", textAlign: "center" }}>
                      {item.qty}
                    </span>
                    <button
                      onClick={() => updateQty(item.id, 1)}
                      className="flex items-center justify-center rounded"
                      style={{ width: "22px", height: "22px", background: "#4F46E5", border: "none", cursor: "pointer", color: "#FFFFFF" }}
                    >
                      <Plus size={11} />
                    </button>
                  </div>

                  {/* Price */}
                  <div className="text-right">
                    {item.aiPrice ? (
                      <div>
                        <span style={{ color: "#DC2626", fontSize: "0.88rem", fontWeight: 700 }}>
                          NT${(item.aiPrice * item.qty).toLocaleString()}
                        </span>
                        <span style={{ color: "#94A3B8", fontSize: "0.7rem", textDecoration: "line-through", marginLeft: "4px" }}>
                          {(item.price * item.qty).toLocaleString()}
                        </span>
                      </div>
                    ) : (
                      <span style={{ color: "#1E293B", fontSize: "0.88rem", fontWeight: 700 }}>
                        NT${(item.price * item.qty).toLocaleString()}
                      </span>
                    )}
                    <div style={{ color: "#94A3B8", fontSize: "0.65rem" }}>
                      NT${item.aiPrice ?? item.price} × {item.qty}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Checkout Panel */}
        <div
          className="border-t px-5 pt-4 pb-5"
          style={{ borderColor: "#E2E8F0", flexShrink: 0 }}
        >
          {/* Subtotals */}
          <div className="mb-3">
            <div className="flex justify-between mb-1.5">
              <span style={{ color: "#64748B", fontSize: "0.78rem" }}>小計</span>
              <span style={{ color: "#1E293B", fontSize: "0.78rem", fontWeight: 500 }}>
                NT${(subtotal + discount).toLocaleString()}
              </span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between mb-1.5">
                <span className="flex items-center gap-1" style={{ color: "#DC2626", fontSize: "0.78rem" }}>
                  <Tag size={11} />
                  AI 動態折扣
                </span>
                <span style={{ color: "#DC2626", fontSize: "0.78rem", fontWeight: 600 }}>
                  -NT${discount.toLocaleString()}
                </span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t" style={{ borderColor: "#F1F5F9" }}>
              <span style={{ color: "#1E293B", fontSize: "0.95rem", fontWeight: 700 }}>應收總計</span>
              <span style={{ color: "#4F46E5", fontSize: "1.1rem", fontWeight: 800 }}>
                NT${total.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Payment method */}
          <div className="mb-3">
            <label style={{ color: "#64748B", fontSize: "0.75rem", fontWeight: 600, display: "block", marginBottom: "6px" }}>
              付款方式
            </label>
            <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
              {paymentMethods.map((pm) => {
                const Icon = pm.icon;
                return (
                  <button
                    key={pm.id}
                    onClick={() => setPaymentMethod(pm.id)}
                    className="flex flex-col items-center gap-1 py-2 rounded-lg border transition-all"
                    style={{
                      background: paymentMethod === pm.id ? "#EEF2FF" : "#F8FAFC",
                      borderColor: paymentMethod === pm.id ? "#4F46E5" : "#E2E8F0",
                      color: paymentMethod === pm.id ? "#4F46E5" : "#64748B",
                      cursor: "pointer",
                      fontSize: "0.65rem",
                      fontWeight: paymentMethod === pm.id ? 700 : 400,
                    }}
                  >
                    <Icon size={14} />
                    {pm.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cash input */}
          {paymentMethod === "cash" && (
            <div className="mb-3">
              <div className="flex gap-2 mb-1.5">
                <div>
                  <label style={{ color: "#64748B", fontSize: "0.73rem", fontWeight: 600, display: "block", marginBottom: "4px" }}>
                    收取現金
                  </label>
                  <div
                    className="flex items-center gap-2 rounded-lg px-3 border"
                    style={{ height: "38px", background: "#FFFFFF", borderColor: "#D1D5DB", width: "130px" }}
                  >
                    <span style={{ color: "#94A3B8", fontSize: "0.82rem" }}>NT$</span>
                    <input
                      type="number"
                      value={cashReceived}
                      onChange={(e) => setCashReceived(e.target.value)}
                      placeholder="0"
                      className="flex-1 border-none outline-none bg-transparent"
                      style={{ color: "#1E293B", fontSize: "0.88rem", fontWeight: 600 }}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ color: "#64748B", fontSize: "0.73rem", fontWeight: 600, display: "block", marginBottom: "4px" }}>
                    找零金額
                  </label>
                  <div
                    className="flex items-center gap-2 rounded-lg px-3 border"
                    style={{
                      height: "38px",
                      background: change >= 0 && received > 0 ? "#ECFDF5" : "#F8FAFC",
                      borderColor: change >= 0 && received > 0 ? "#A7F3D0" : "#E2E8F0",
                      width: "130px",
                    }}
                  >
                    <span style={{ color: "#94A3B8", fontSize: "0.82rem" }}>NT$</span>
                    <span style={{ color: change >= 0 ? "#059669" : "#DC2626", fontSize: "0.88rem", fontWeight: 700 }}>
                      {received > 0 ? Math.max(0, change).toLocaleString() : "—"}
                    </span>
                  </div>
                </div>
              </div>
              {/* Quick cash buttons */}
              <div className="flex gap-1">
                {[100, 500, 1000].map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setCashReceived(amount.toString())}
                    className="flex-1 rounded py-1 text-center transition-colors border"
                    style={{
                      fontSize: "0.7rem",
                      background: "#F8FAFC",
                      borderColor: "#E2E8F0",
                      color: "#475569",
                      cursor: "pointer",
                    }}
                  >
                    NT${amount}
                  </button>
                ))}
                <button
                  onClick={() => setCashReceived(total.toString())}
                  className="flex-1 rounded py-1 text-center transition-colors border"
                  style={{
                    fontSize: "0.7rem",
                    background: "#F8FAFC",
                    borderColor: "#E2E8F0",
                    color: "#4F46E5",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  剛好
                </button>
              </div>
            </div>
          )}

          {/* Checkout button */}
          <button
            onClick={handleCheckout}
            disabled={cart.length === 0 || checkingOut}
            className="flex items-center justify-center gap-2 w-full rounded-xl transition-all"
            style={{
              height: "52px",
              background: cart.length === 0 ? "#E2E8F0" : "linear-gradient(135deg, #059669 0%, #047857 100%)",
              color: cart.length === 0 ? "#94A3B8" : "#FFFFFF",
              border: "none",
              cursor: cart.length === 0 ? "not-allowed" : "pointer",
              fontSize: "1rem",
              fontWeight: 700,
              boxShadow: cart.length > 0 ? "0 4px 14px rgba(5,150,105,0.35)" : "none",
            }}
          >
            {checkingOut ? <Loader2 size={18} className="animate-spin" /> : <Receipt size={18} />}
            確認結帳 NT${total.toLocaleString()}
          </button>
        </div>
      </div>
    </div>
  );
}