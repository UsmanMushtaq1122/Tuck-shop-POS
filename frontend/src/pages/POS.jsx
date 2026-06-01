import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDispatch, useSelector } from "react-redux";
import {
  FiSearch,
  FiPlus,
  FiMinus,
  FiTrash2,
  FiPrinter,
  FiDollarSign,
  FiX,
  FiPhone,
  FiUser,
  FiTag,
  FiPause,
  FiPlay,
  FiClock,
  FiRefreshCw,
  FiArrowLeft,
  FiPercent,
  FiSmartphone,
  FiCreditCard,
  FiKey,
  FiSave,
  FiFileText,
  FiShoppingCart,
  FiGrid,
  FiList,
  FiPhoneCall,
  FiChevronDown,
  FiCheck,
  FiCopy,
} from "react-icons/fi";
import { QRCodeCanvas } from "qrcode.react";
import { useCart } from "@/hooks/useCart";
import { formatCurrency, cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { fetchProducts } from "@/store/slices/productSlice";
import { createOrder } from "@/store/slices/orderSlice";
import { addToast } from "@/store/slices/uiSlice";
import useBarcodeScanner from "@/hooks/useBarcodeScanner";
import ThermalPrinter from "@/services/printer";
import { productService, orderService, customerService } from "@/services/api";
import { heldOrders as sampleHeldOrders } from "@/data/sampleData";
import PrintReceipt from "@/components/PrintReceipt";
import ReprintButton from "@/components/ReprintButton";

const PAYMENT_METHODS = [
  {
    id: "cash",
    label: "Cash",
    icon: FiDollarSign,
    color: "bg-success hover:bg-green-600",
    shortcut: "F1",
  },
  {
    id: "card",
    label: "Card",
    icon: FiCreditCard,
    color: "bg-accent hover:bg-accent-hover",
    shortcut: "F2",
  },
  {
    id: "jazzcash",
    label: "JazzCash",
    icon: FiPhone,
    color: "bg-red-500 hover:bg-red-600",
    shortcut: "F3",
  },
  {
    id: "easypaisa",
    label: "EasyPaisa",
    icon: FiSmartphone,
    color: "bg-green-500 hover:bg-green-600",
    shortcut: "F4",
  },
  {
    id: "credit",
    label: "Credit",
    icon: FiCreditCard,
    color: "bg-purple-500 hover:bg-purple-600",
    shortcut: "",
  },
];

const TAX_RATE = 5;
const STORE_INFO = {
  name: "Tuck Shop POS",
  address: "Main Street, City",
  phone: "0300-1234567",
  logo: "🏪",
};

const SHORTCUTS = [
  { key: "F1-F4", label: "Quick Payment" },
  { key: "F5", label: "Search" },
  { key: "F6", label: "Discount" },
  { key: "F7", label: "Suspend" },
  { key: "F8", label: "Resume" },
  { key: "F9", label: "Clear" },
  { key: "F10", label: "Print" },
  { key: "F12", label: "New Order" },
  { key: "Ctrl+Enter", label: "Pay" },
  { key: "Esc", label: "Close" },
];

function SplitPaymentModal({ isOpen, onClose, grandTotal, onComplete }) {
  const [splits, setSplits] = useState([]);

  useEffect(() => {
    if (isOpen) {
      setSplits([{ method: "cash", amount: grandTotal }]);
    }
  }, [isOpen, grandTotal]);

  const totalAllocated = splits.reduce(
    (s, p) => s + (Number(p.amount) || 0),
    0
  );
  const remaining = grandTotal - totalAllocated;
  const isValid = Math.abs(remaining) < 1 && splits.length > 0;

  const addSplit = () => {
    if (splits.length < PAYMENT_METHODS.length) {
      const usedMethods = splits.map((s) => s.method);
      const nextMethod = PAYMENT_METHODS.find(
        (m) => !usedMethods.includes(m.id)
      );
      if (nextMethod)
        setSplits([...splits, { method: nextMethod.id, amount: 0 }]);
    }
  };

  const updateSplit = (index, field, value) => {
    const updated = [...splits];
    if (field === "method") updated[index] = { method: value, amount: 0 };
    else updated[index] = { ...updated[index], amount: Number(value) || 0 };
    setSplits(updated);
  };

  const removeSplit = (index) => {
    if (splits.length > 1) setSplits(splits.filter((_, i) => i !== index));
  };

  const handleComplete = () => {
    if (isValid) {
      onComplete(splits.filter((s) => (Number(s.amount) || 0) > 0));
      onClose();
    }
  };

  return (
    <Modal open={isOpen} onClose={onClose} title="Split Payment" size="sm">
      <div className="space-y-4">
        <p className="text-sm text-foreground-secondary">
          Split total <strong>{formatCurrency(grandTotal)}</strong> across
          payment methods
        </p>
        <div className="space-y-3">
          {splits.map((split, i) => (
            <div key={i} className="flex items-center gap-2">
              <select
                value={split.method}
                onChange={(e) => updateSplit(i, "method", e.target.value)}
                className="flex-1 px-3 py-2 bg-background-tertiary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option
                    key={m.id}
                    value={m.id}
                    disabled={splits.some(
                      (s) => s.method === m.id && s !== split
                    )}
                  >
                    {m.label}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={split.amount || ""}
                onChange={(e) => updateSplit(i, "amount", e.target.value)}
                placeholder="Amount"
                className="w-28 px-3 py-2 bg-background-tertiary border border-border rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-accent/50"
              />
              {splits.length > 1 && (
                <button
                  onClick={() => removeSplit(i)}
                  className="p-2 text-danger hover:bg-danger/10 rounded-lg transition-colors"
                >
                  <FiX className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
        {splits.length < PAYMENT_METHODS.length && (
          <Button
            variant="ghost"
            size="sm"
            onClick={addSplit}
            className="w-full"
          >
            <FiPlus className="w-4 h-4 mr-1" /> Add Payment Method
          </Button>
        )}
        <div className="flex justify-between text-sm pt-2 border-t border-border">
          <span className="text-foreground-muted">
            Total: {formatCurrency(grandTotal)}
          </span>
          <span
            className={cn(
              "font-medium",
              remaining > 0
                ? "text-warning"
                : remaining < 0
                ? "text-danger"
                : "text-success"
            )}
          >
            Remaining: {formatCurrency(remaining)}
          </span>
        </div>
        <Button className="w-full" disabled={!isValid} onClick={handleComplete}>
          <FiCheck className="w-4 h-4 mr-2" /> Complete Sale
        </Button>
      </div>
    </Modal>
  );
}

function RefundModal({ isOpen, onClose, orders, dispatch }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [refundItems, setRefundItems] = useState([]);
  const [refundMethod, setRefundMethod] = useState("cash");
  const [processing, setProcessing] = useState(false);

  const filteredOrders = orders.filter(
    (o) =>
      o.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.id?.toString().toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectOrder = (order) => {
    setSelectedOrder(order);
    setRefundItems(
      order.items?.map((item) => ({
        ...item,
        refundQty: 0,
        refunded: false,
      })) || []
    );
  };

  const toggleRefundItem = (index) => {
    const updated = [...refundItems];
    updated[index] = {
      ...updated[index],
      refunded: !updated[index].refunded,
      refundQty: updated[index].refunded ? 0 : updated[index].quantity,
    };
    setRefundItems(updated);
  };

  const updateRefundQty = (index, qty) => {
    const updated = [...refundItems];
    updated[index] = {
      ...updated[index],
      refundQty: Math.min(Math.max(0, qty), updated[index].quantity),
    };
    setRefundItems(updated);
  };

  const refundTotal = refundItems.reduce(
    (sum, item) => sum + (item.refunded ? item.price * item.refundQty : 0),
    0
  );

  const processRefund = async () => {
    setProcessing(true);
    try {
      await new Promise((r) => setTimeout(r, 1000));
      dispatch(
        addToast({
          title: "Refund Processed",
          description: `${formatCurrency(
            refundTotal
          )} refunded via ${refundMethod}`,
          variant: "success",
        })
      );
      setSelectedOrder(null);
      setRefundItems([]);
      setSearchTerm("");
      onClose();
    } finally {
      setProcessing(false);
    }
  };

  const back = () => {
    setSelectedOrder(null);
    setRefundItems([]);
  };

  return (
    <Modal open={isOpen} onClose={onClose} title="Process Refund" size="lg">
      {!selectedOrder ? (
        <div className="space-y-4">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
            <input
              type="text"
              placeholder="Search by order number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-background-tertiary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
              autoFocus
            />
          </div>
          <div className="max-h-64 overflow-y-auto space-y-2">
            {filteredOrders.slice(0, 20).map((order) => (
              <button
                key={order.id || order.order_number}
                onClick={() => selectOrder(order)}
                className="w-full flex items-center justify-between p-3 bg-background-tertiary rounded-lg hover:bg-border transition-colors text-left"
              >
                <div>
                  <p className="text-sm font-medium">
                    {order.order_number || `Order #${order.id}`}
                  </p>
                  <p className="text-xs text-foreground-muted">
                    {order.date} &middot; {order.items?.length || 0} items
                  </p>
                </div>
                <span className="text-sm font-medium">
                  {formatCurrency(order.total || order.grandTotal || 0)}
                </span>
              </button>
            ))}
            {filteredOrders.length === 0 && searchTerm && (
              <p className="text-sm text-foreground-muted text-center py-4">
                No orders found
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <button
            onClick={back}
            className="flex items-center gap-2 text-sm text-foreground-secondary hover:text-foreground transition-colors"
          >
            <FiArrowLeft className="w-4 h-4" /> Back to search
          </button>
          <div className="bg-background-tertiary rounded-xl p-4 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-foreground-muted">Order</span>
              <span className="font-medium">{selectedOrder.order_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-foreground-muted">Date</span>
              <span>{selectedOrder.date}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-foreground-muted">Total</span>
              <span>
                {formatCurrency(
                  selectedOrder.total || selectedOrder.grandTotal || 0
                )}
              </span>
            </div>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {refundItems.map((item, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg transition-colors",
                  item.refunded
                    ? "bg-danger/5 border border-danger/20"
                    : "bg-background-tertiary"
                )}
              >
                <input
                  type="checkbox"
                  checked={item.refunded}
                  onChange={() => toggleRefundItem(i)}
                  className="w-4 h-4 rounded accent-danger"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {item.product_name || item.name}
                  </p>
                  <p className="text-xs text-foreground-muted">
                    {formatCurrency(item.price)} x {item.quantity}
                  </p>
                </div>
                {item.refunded && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateRefundQty(i, item.refundQty - 1)}
                      className="w-6 h-6 rounded bg-background flex items-center justify-center hover:bg-border text-xs"
                    >
                      -
                    </button>
                    <span className="w-6 text-center text-xs font-medium">
                      {item.refundQty}
                    </span>
                    <button
                      onClick={() => updateRefundQty(i, item.refundQty + 1)}
                      className="w-6 h-6 rounded bg-background flex items-center justify-center hover:bg-border text-xs"
                    >
                      +
                    </button>
                  </div>
                )}
                <span className="text-sm font-medium w-20 text-right">
                  {formatCurrency(
                    item.price * (item.refunded ? item.refundQty : 0)
                  )}
                </span>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-lg font-bold">
            <span>Refund Total</span>
            <span className="text-danger">{formatCurrency(refundTotal)}</span>
          </div>
          <div>
            <label className="text-xs text-foreground-muted mb-1 block">
              Refund Method
            </label>
            <div className="flex gap-2">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setRefundMethod(m.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                    refundMethod === m.id
                      ? "bg-danger text-white"
                      : "bg-background-tertiary text-foreground-secondary hover:bg-border"
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          <Button
            className="w-full"
            variant="danger"
            disabled={refundTotal <= 0 || processing}
            onClick={processRefund}
          >
            {processing
              ? "Processing..."
              : `Process Refund - ${formatCurrency(refundTotal)}`}
          </Button>
        </div>
      )}
    </Modal>
  );
}

function KeyboardShortcutsModal({ isOpen, onClose }) {
  return (
    <Modal open={isOpen} onClose={onClose} title="Keyboard Shortcuts" size="sm">
      <div className="space-y-2">
        {SHORTCUTS.map((sc) => (
          <div key={sc.key} className="flex items-center justify-between py-2">
            <span className="text-sm text-foreground-secondary">
              {sc.label}
            </span>
            <kbd className="px-2.5 py-1 bg-background-tertiary border border-border rounded text-xs font-mono text-accent">
              {sc.key}
            </kbd>
          </div>
        ))}
      </div>
    </Modal>
  );
}

function PaymentPanel({ method, amount, isSelected, onSelect }) {
  const Icon = method.icon;
  return (
    <button
      onClick={onSelect}
      className={cn(
        "flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-xl text-white text-xs font-medium transition-all duration-200",
        isSelected
          ? "ring-2 ring-white ring-offset-2 ring-offset-transparent scale-105"
          : "opacity-80 hover:opacity-100",
        method.color
      )}
    >
      <Icon className="w-5 h-5" />
      {method.label}
      <span className="text-[10px] opacity-75">{method.shortcut}</span>
    </button>
  );
}

export default function POS() {
  const dispatch = useDispatch();
  const { items: products, loading } = useSelector((state) => state.products);
  const { user } = useSelector((state) => state.auth);
  const { items: reduxOrders = [] } = useSelector((state) => state.orders);

  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [discountType, setDiscountType] = useState("percent");
  const [discountValue, setDiscountValue] = useState(0);
  const [notes, setNotes] = useState("");
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);
  const [completedOrders, setCompletedOrders] = useState([]);
  const {
    cart,
    cartTotal,
    cartCount,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
  } = useCart();

  const [showReceipt, setShowReceipt] = useState(false);
  const [showSplitPayment, setShowSplitPayment] = useState(false);
  const [showRefund, setShowRefund] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showSuspended, setShowSuspended] = useState(false);
  const [suspendedOrders, setSuspendedOrders] = useState([]);
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [showPrintPreviewModal, setShowPrintPreviewModal] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showCustomerSelect, setShowCustomerSelect] = useState(false);

  const searchRef = useRef(null);
  const discountRef = useRef(null);

  const categories = [
    "All",
    ...new Set(products.map((p) => p.category_name).filter(Boolean)),
  ];
  const discountAmount =
    discountType === "percent"
      ? (cartTotal * discountValue) / 100
      : discountType === "fixed"
      ? discountValue
      : 0;
  const subtotal = Math.max(0, cartTotal - discountAmount);
  const tax = subtotal * (TAX_RATE / 100);
  const grandTotal = subtotal + tax;

  useEffect(() => {
    dispatch(fetchProducts());
    customerService
      .getAll()
      .then((res) => setCustomers(res.customers || []))
      .catch(() => {});
  }, [dispatch]);

  useEffect(() => {
    try {
      const stored = JSON.parse(
        localStorage.getItem("suspended_orders") || "[]"
      );
      setSuspendedOrders(stored);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      const stored = JSON.parse(
        localStorage.getItem("completed_orders") || "[]"
      );
      setCompletedOrders(stored);
    } catch {}
  }, []);

  const saveSuspendedOrders = (orders) => {
    localStorage.setItem("suspended_orders", JSON.stringify(orders));
    setSuspendedOrders(orders);
  };

  const saveCompletedOrder = (order) => {
    const updated = [order, ...completedOrders];
    localStorage.setItem(
      "completed_orders",
      JSON.stringify(updated.slice(0, 200))
    );
    setCompletedOrders(updated);
  };

  const handleBarcodeScan = useCallback(
    async (barcode) => {
      try {
        const localProduct = products.find((p) => p.barcode === barcode);
        if (localProduct) {
          addToCart({
            id: localProduct.id,
            name: localProduct.name,
            price: localProduct.selling_price,
            stock: localProduct.stock_quantity,
          });
          return;
        }
        const response = await productService.getByBarcode(barcode);
        if (response?.product) {
          addToCart({
            id: response.product.id,
            name: response.product.name,
            price: response.product.selling_price,
            stock: response.product.stock_quantity,
          });
        }
      } catch {
      } finally {
        setSearchQuery("");
      }
    },
    [addToCart, products]
  );

  useBarcodeScanner(handleBarcodeScan);

  const filteredProducts = products.filter((product) => {
    const matchesCategory =
      activeCategory === "All" || product.category_name === activeCategory;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      product.name.toLowerCase().includes(q) ||
      product.barcode?.includes(q) ||
      product.sku?.toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  const generateInvoiceNumber = () => {
    const now = new Date();
    return `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}${String(now.getDate()).padStart(2, "0")}-${String(
      now.getHours()
    ).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(
      now.getSeconds()
    ).padStart(2, "0")}`;
  };

  const buildOrderData = (paymentMethod) => ({
    items: cart.map((item) => ({
      product_id: item.id,
      product_name: item.name,
      quantity: item.quantity,
      price: item.price,
      total: item.price * item.quantity,
    })),
    subtotal: Math.round(subtotal),
    discount: Math.round(discountAmount),
    discountType,
    discountValue,
    tax: Math.round(tax),
    taxRate: TAX_RATE,
    total: Math.round(grandTotal),
    payment_method: paymentMethod,
    status: "completed",
    notes,
    order_number: generateInvoiceNumber(),
    date: new Date().toLocaleString(),
    cashier: user?.name || "Cashier",
    customer_id: selectedCustomer?.id || null,
    customer_name: selectedCustomer?.name || null,
  });

  const handleCompleteSale = async (method) => {
    if (cart.length === 0) return;
    const paymentMethod =
      typeof method === "string" ? method : method?.[0]?.method || "cash";
    setSelectedPayment(paymentMethod);
    setIsProcessing(true);

    if (paymentMethod === "credit" && !selectedCustomer) {
      dispatch(
        addToast({
          title: "Error",
          description: "Please select a customer for credit payment",
          variant: "danger",
        })
      );
      setIsProcessing(false);
      return;
    }

    try {
      const orderData = buildOrderData(
        typeof method === "string"
          ? method
          : method.map((s) => `${s.method}:${s.amount}`).join(", ")
      );
      const result = await dispatch(createOrder(orderData));

      if (paymentMethod === "credit" && selectedCustomer) {
        const newCredit = Math.max(
          0,
          (selectedCustomer.credit_balance || 0) - grandTotal
        );
        await customerService.update(selectedCustomer.id, {
          name: selectedCustomer.name,
          phone: selectedCustomer.phone,
          email: selectedCustomer.email,
          address: selectedCustomer.address,
          credit_balance: newCredit,
          loyalty_points:
            (selectedCustomer.loyalty_points || 0) +
            Math.floor(grandTotal / 100),
        });
      }

      const finalOrder = {
        ...orderData,
        order_number: result?.payload?.order_number || orderData.order_number,
        id: result?.payload?.id || `ord-${Date.now()}`,
      };

      setLastOrder(finalOrder);
      saveCompletedOrder(finalOrder);

      const printer = new ThermalPrinter();
      printer.storeLastReceipt(finalOrder);

      const settings = JSON.parse(
        localStorage.getItem("printer_settings") || "{}"
      );
      if (settings.autoPrint) {
        setTimeout(() => {
          handlePrintReceipt(finalOrder);
        }, 500);
      }

      setShowReceipt(true);
    } catch {
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSplitPayment = (splits) => {
    handleCompleteSale(splits);
  };

  const handleSuspend = () => {
    if (cart.length === 0) return;
    const suspended = {
      id: `hold-${Date.now()}`,
      time: new Date().toLocaleTimeString(),
      date: new Date().toLocaleString(),
      items: [...cart],
      total: grandTotal,
      discountType,
      discountValue,
      notes,
    };
    saveSuspendedOrders([suspended, ...suspendedOrders]);
    clearCart();
    setDiscountValue(0);
    setNotes("");
    dispatch(
      addToast({
        title: "Order Suspended",
        description: `Order #${suspended.id.slice(-6)} saved`,
        variant: "info",
      })
    );
  };

  const handleResume = (suspended) => {
    clearCart();
    suspended.items.forEach((item) =>
      addToCart({
        id: item.id,
        name: item.name,
        price: item.price,
        stock: item.stock || 999,
      })
    );
    setDiscountType(suspended.discountType || "percent");
    setDiscountValue(suspended.discountValue || 0);
    setNotes(suspended.notes || "");
    saveSuspendedOrders(suspendedOrders.filter((o) => o.id !== suspended.id));
    setShowSuspended(false);
    dispatch(
      addToast({
        title: "Order Restored",
        description: `Suspended order resumed`,
        variant: "success",
      })
    );
  };

  const handleDeleteSuspended = (id) => {
    saveSuspendedOrders(suspendedOrders.filter((o) => o.id !== id));
  };

  const handlePrintReceipt = (order) => {
    const data = order || lastOrder;
    if (!data) return;
    const items = (cart.length > 0 && !order ? cart : data.items) || [];
    const printer = new ThermalPrinter();
    printer.printOrder({
      ...data,
      items,
      shopName: STORE_INFO.name,
      shopAddress: STORE_INFO.address,
      shopPhone: STORE_INFO.phone,
      shopLogo: STORE_INFO.logo,
    });
  };

  const handlePrintPreview = () => {
    setShowPrintPreviewModal(true);
  };

  const handleClearAfterReceipt = () => {
    setShowReceipt(false);
    setSelectedPayment(null);
    setDiscountValue(0);
    setNotes("");
    setLastOrder(null);
    setSelectedCustomer(null);
    clearCart();
  };

  const handleNewOrder = () => {
    clearCart();
    setDiscountValue(0);
    setNotes("");
    setSelectedPayment(null);
    setSelectedCustomer(null);
  };

  const handleKeyDown = useCallback(
    (e) => {
      const target = e.target;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT";
      const ctrl = e.ctrlKey || e.metaKey;

      if (e.key === "F1" && !isInput) {
        e.preventDefault();
        handleCompleteSale("cash");
      }
      if (e.key === "F2" && !isInput) {
        e.preventDefault();
        handleCompleteSale("card");
      }
      if (e.key === "F3" && !isInput) {
        e.preventDefault();
        handleCompleteSale("jazzcash");
      }
      if (e.key === "F4" && !isInput) {
        e.preventDefault();
        handleCompleteSale("easypaisa");
      }
      if (e.key === "F5") {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "F6") {
        e.preventDefault();
        discountRef.current?.focus();
      }
      if (e.key === "F7" && !isInput) {
        e.preventDefault();
        handleSuspend();
      }
      if (e.key === "F8" && !isInput) {
        e.preventDefault();
        setShowSuspended(true);
      }
      if (e.key === "F9" && !isInput) {
        e.preventDefault();
        if (cart.length > 0 && window.confirm("Clear cart?")) clearCart();
      }
      if (e.key === "F10" && !isInput) {
        e.preventDefault();
        if (lastOrder) handlePrintPreview();
      }
      if (e.key === "F12" && !isInput) {
        e.preventDefault();
        handleNewOrder();
      }
      if (e.key === "Escape") {
        setShowReceipt(false);
        setShowSplitPayment(false);
        setShowRefund(false);
        setShowShortcuts(false);
        setShowSuspended(false);
        setShowKeyboardShortcuts(false);
      }
      if (ctrl && e.key === "Enter" && !isInput) {
        e.preventDefault();
        setShowSplitPayment(true);
      }
    },
    [
      cart,
      lastOrder,
      discountValue,
      discountType,
      discountAmount,
      subtotal,
      tax,
      grandTotal,
      notes,
    ]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const receiptQRValue = lastOrder
    ? JSON.stringify({
        order: lastOrder.order_number,
        total: lastOrder.total,
        date: lastOrder.date,
        store: STORE_INFO.name,
      })
    : "";

  return (
    <div className="flex h-[calc(100vh-88px)] gap-4 -mt-6">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex-1 flex flex-col bg-background-secondary rounded-xl border border-border overflow-hidden"
      >
        <div className="p-3 border-b border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="relative flex-1">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
              <input
                ref={searchRef}
                type="text"
                placeholder="Search by name, barcode, or SKU... (F5)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-background-tertiary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
              />
            </div>
            <div className="flex items-center gap-1 bg-background-tertiary rounded-lg p-1">
              <button
                onClick={() => setViewMode("grid")}
                className={cn(
                  "p-1.5 rounded-md transition-colors",
                  viewMode === "grid"
                    ? "bg-accent text-white"
                    : "text-foreground-muted hover:text-foreground"
                )}
              >
                <FiGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={cn(
                  "p-1.5 rounded-md transition-colors",
                  viewMode === "list"
                    ? "bg-accent text-white"
                    : "text-foreground-muted hover:text-foreground"
                )}
              >
                <FiList className="w-4 h-4" />
              </button>
            </div>
            <Badge variant="info" className="px-3 py-1.5 whitespace-nowrap">
              {filteredProducts.length} items
            </Badge>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <motion.button
                key={cat}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-200",
                  activeCategory === cat
                    ? "bg-accent text-white shadow-lg shadow-accent/30"
                    : "bg-background-tertiary text-foreground-secondary hover:bg-border"
                )}
              >
                {cat}
              </motion.button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {[...Array(10)].map((_, i) => (
                <div
                  key={i}
                  className="h-32 bg-background-tertiary rounded-xl animate-pulse"
                />
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-foreground-muted">
              <FiSearch className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm">No products found</p>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {filteredProducts.map((product) => (
                <motion.button
                  key={product.id}
                  layout
                  whileTap={{ scale: 0.95 }}
                  whileHover={{ y: -2 }}
                  onClick={() =>
                    addToCart({
                      id: product.id,
                      name: product.name,
                      price: product.selling_price,
                      stock: product.stock_quantity,
                    })
                  }
                  className="bg-background-tertiary border border-border rounded-xl p-3 text-left hover:border-accent/50 transition-all group relative"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                      {product.image || "📦"}
                    </div>
                    <Badge
                      variant={
                        product.stock_quantity <= 0
                          ? "danger"
                          : product.stock_quantity <= 5
                          ? "warning"
                          : "default"
                      }
                      className="text-[10px]"
                    >
                      {product.stock_quantity <= 0
                        ? "Out"
                        : product.stock_quantity}
                    </Badge>
                  </div>
                  <h4 className="font-medium text-xs truncate leading-tight">
                    {product.name}
                  </h4>
                  {product.category_name && (
                    <p className="text-[10px] text-foreground-muted mt-0.5">
                      {product.category_name}
                    </p>
                  )}
                  <p className="text-accent font-bold text-sm mt-1.5">
                    {formatCurrency(product.selling_price)}
                  </p>
                </motion.button>
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredProducts.map((product) => (
                <motion.button
                  key={product.id}
                  layout
                  whileTap={{ scale: 0.99 }}
                  onClick={() =>
                    addToCart({
                      id: product.id,
                      name: product.name,
                      price: product.selling_price,
                      stock: product.stock_quantity,
                    })
                  }
                  className="w-full flex items-center gap-3 p-3 bg-background-tertiary rounded-lg hover:bg-border transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center text-base">
                    {product.image || "📦"}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium truncate">
                      {product.name}
                    </p>
                    <p className="text-xs text-foreground-muted">
                      SKU: {product.sku || product.barcode || "N/A"}
                    </p>
                  </div>
                  <Badge
                    variant={
                      product.stock_quantity <= 5 ? "warning" : "default"
                    }
                    className="text-[10px]"
                  >
                    {product.stock_quantity} left
                  </Badge>
                  <p className="text-accent font-bold text-sm w-24 text-right">
                    {formatCurrency(product.selling_price)}
                  </p>
                  <FiPlus className="w-4 h-4 text-foreground-muted" />
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-96 bg-background-secondary rounded-xl border border-border flex flex-col"
      >
        <div className="p-3 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-semibold font-heading flex items-center gap-2">
              <FiShoppingCart className="w-4 h-4 text-accent" /> Current Order
            </h2>
            <Badge variant="info">{cartCount} items</Badge>
          </div>
          <div className="flex gap-1.5">
            <PaymentPanel
              method={PAYMENT_METHODS[0]}
              amount={PAYMENT_METHODS[0].amount}
              isSelected={false}
              onSelect={() => handleCompleteSale("cash")}
            />
            <PaymentPanel
              method={PAYMENT_METHODS[1]}
              amount={PAYMENT_METHODS[1].amount}
              isSelected={false}
              onSelect={() => handleCompleteSale("card")}
            />
            <PaymentPanel
              method={PAYMENT_METHODS[2]}
              amount={PAYMENT_METHODS[2].amount}
              isSelected={false}
              onSelect={() => handleCompleteSale("jazzcash")}
            />
            <PaymentPanel
              method={PAYMENT_METHODS[3]}
              amount={PAYMENT_METHODS[3].amount}
              isSelected={false}
              onSelect={() => handleCompleteSale("easypaisa")}
            />
            <PaymentPanel
              method={PAYMENT_METHODS[4]}
              amount={PAYMENT_METHODS[4].amount}
              isSelected={false}
              onSelect={() => handleCompleteSale("credit")}
            />
          </div>
          <div className="relative mt-2">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                {selectedCustomer ? (
                  <div className="flex items-center justify-between p-2 bg-background-tertiary rounded-lg">
                    <div className="flex items-center gap-2">
                      <FiUser className="w-4 h-4 text-accent" />
                      <span className="text-xs font-medium">
                        {selectedCustomer.name}
                      </span>
                    </div>
                    <button
                      onClick={() => setSelectedCustomer(null)}
                      className="p-1 rounded hover:bg-danger/10 text-danger transition-colors"
                    >
                      <FiX className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowCustomerSelect(!showCustomerSelect)}
                    className="w-full flex items-center gap-2 p-2 bg-background-tertiary rounded-lg text-xs text-foreground-muted hover:bg-border transition-colors"
                  >
                    <FiUser className="w-4 h-4" />
                    Select Customer
                    <FiChevronDown className="w-3 h-3 ml-auto" />
                  </button>
                )}
              </div>
              {selectedCustomer && selectedCustomer.credit_balance > 0 && (
                <Badge variant="warning" className="text-[10px] shrink-0">
                  Credit: {formatCurrency(selectedCustomer.credit_balance)}
                </Badge>
              )}
            </div>
            <AnimatePresence>
              {showCustomerSelect && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute z-10 top-full left-0 right-0 mt-1 bg-background-secondary border border-border rounded-lg shadow-xl max-h-40 overflow-y-auto"
                >
                  {customers.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setSelectedCustomer(c);
                        setShowCustomerSelect(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-background-tertiary transition-colors"
                    >
                      <FiUser className="w-3.5 h-3.5 text-foreground-muted" />
                      <span className="flex-1 text-left">{c.name}</span>
                      {c.credit_balance > 0 && (
                        <Badge variant="warning" className="text-[10px]">
                          {formatCurrency(c.credit_balance)}
                        </Badge>
                      )}
                    </button>
                  ))}
                  {customers.length === 0 && (
                    <p className="px-3 py-2 text-xs text-foreground-muted">
                      No customers found
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-foreground-muted">
              <FiShoppingCart className="w-14 h-14 mb-3 opacity-20" />
              <p className="text-sm font-medium">Cart is empty</p>
              <p className="text-xs mt-1">Scan barcode or tap a product</p>
              <div className="mt-4 p-3 bg-background-tertiary rounded-lg text-xs space-y-1.5">
                <p className="font-medium text-foreground-secondary mb-1">
                  Quick Tips
                </p>
                <p>
                  <kbd className="px-1 py-0.5 bg-border rounded text-[10px]">
                    F5
                  </kbd>{" "}
                  Search &middot;{" "}
                  <kbd className="px-1 py-0.5 bg-border rounded text-[10px]">
                    F1-F4
                  </kbd>{" "}
                  Pay
                </p>
                <p>
                  <kbd className="px-1 py-0.5 bg-border rounded text-[10px]">
                    F7
                  </kbd>{" "}
                  Hold &middot;{" "}
                  <kbd className="px-1 py-0.5 bg-border rounded text-[10px]">
                    F8
                  </kbd>{" "}
                  Resume
                </p>
                <p>
                  <kbd className="px-1 py-0.5 bg-border rounded text-[10px]">
                    F12
                  </kbd>{" "}
                  New &middot;{" "}
                  <kbd className="px-1 py-0.5 bg-border rounded text-[10px]">
                    Ctrl+Enter
                  </kbd>{" "}
                  Split Pay
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {cart.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex items-center gap-2 p-2.5 bg-background-tertiary rounded-lg group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">
                        {item.name}
                      </p>
                      <p className="text-[10px] text-foreground-muted">
                        {formatCurrency(item.price)} each
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() =>
                          updateQuantity(item.id, item.quantity - 1)
                        }
                        className="w-6 h-6 rounded-md bg-background flex items-center justify-center hover:bg-border transition-colors"
                      >
                        <FiMinus className="w-3 h-3" />
                      </button>
                      <span className="w-7 text-center text-xs font-medium">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() =>
                          updateQuantity(item.id, item.quantity + 1)
                        }
                        className="w-6 h-6 rounded-md bg-background flex items-center justify-center hover:bg-border transition-colors"
                      >
                        <FiPlus className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-xs font-semibold w-16 text-right tabular-nums">
                      {formatCurrency(item.price * item.quantity)}
                    </p>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="opacity-0 group-hover:opacity-100 text-danger hover:text-red-400 transition-all w-5 h-5 flex items-center justify-center"
                    >
                      <FiTrash2 className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        <div className="p-3 border-t border-border space-y-2.5">
          <div className="flex items-center gap-2">
            <FiTag className="w-3.5 h-3.5 text-foreground-muted shrink-0" />
            <div className="flex gap-1">
              <button
                onClick={() => setDiscountType("percent")}
                className={cn(
                  "px-2 py-1 rounded text-[10px] font-medium transition-colors",
                  discountType === "percent"
                    ? "bg-accent text-white"
                    : "bg-background-tertiary text-foreground-muted hover:bg-border"
                )}
              >
                %
              </button>
              <button
                onClick={() => setDiscountType("fixed")}
                className={cn(
                  "px-2 py-1 rounded text-[10px] font-medium transition-colors",
                  discountType === "fixed"
                    ? "bg-accent text-white"
                    : "bg-background-tertiary text-foreground-muted hover:bg-border"
                )}
              >
                Rs
              </button>
            </div>
            <input
              ref={discountRef}
              type="number"
              placeholder={discountType === "percent" ? "Disc %" : "Disc Rs"}
              value={discountValue || ""}
              onChange={(e) =>
                setDiscountValue(Math.max(0, Number(e.target.value)))
              }
              className="w-16 px-2 py-1 bg-background-tertiary border border-border rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-accent/50 tabular-nums"
            />
            <span className="text-[10px] text-foreground-muted">
              -{formatCurrency(discountAmount)}
            </span>
          </div>

          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-foreground-muted">Subtotal</span>
              <span className="tabular-nums">{formatCurrency(cartTotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-foreground-muted">
                  Discount (
                  {discountType === "percent" ? `${discountValue}%` : "Fixed"})
                </span>
                <span className="text-success tabular-nums">
                  -{formatCurrency(discountAmount)}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-foreground-muted">Tax ({TAX_RATE}%)</span>
              <span className="tabular-nums">{formatCurrency(tax)}</span>
            </div>
            <div className="flex justify-between text-base font-bold pt-1.5 border-t border-border">
              <span>Total</span>
              <span className="text-accent tabular-nums">
                {formatCurrency(grandTotal)}
              </span>
            </div>
          </div>

          <div className="flex gap-1.5">
            <Button
              variant="secondary"
              size="sm"
              className="flex-1 !px-2 !text-[11px]"
              onClick={() => setShowSplitPayment(true)}
              disabled={cart.length === 0}
            >
              <FiCopy className="w-3 h-3 mr-1" /> Split
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="flex-1 !px-2 !text-[11px]"
              onClick={handleSuspend}
              disabled={cart.length === 0}
            >
              <FiPause className="w-3 h-3 mr-1" /> Hold
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="flex-1 !px-2 !text-[11px]"
              onClick={() => setShowSuspended(true)}
            >
              <FiPlay className="w-3 h-3 mr-1" /> Resume
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="flex-1 !px-2 !text-[11px]"
              onClick={() => setShowRefund(true)}
            >
              <FiRefreshCw className="w-3 h-3 mr-1" /> Refund
            </Button>
          </div>

          <div className="flex gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 !text-[11px]"
              onClick={() => clearCart()}
              disabled={cart.length === 0}
            >
              <FiX className="w-3 h-3 mr-1" /> Clear
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 !text-[11px]"
              onClick={() => setShowKeyboardShortcuts(true)}
            >
              <FiKey className="w-3 h-3 mr-1" /> Shortcuts
            </Button>
          </div>
        </div>
      </motion.div>

      <SplitPaymentModal
        isOpen={showSplitPayment}
        onClose={() => setShowSplitPayment(false)}
        grandTotal={grandTotal}
        onComplete={handleSplitPayment}
      />

      <RefundModal
        isOpen={showRefund}
        onClose={() => setShowRefund(false)}
        orders={[...completedOrders, ...reduxOrders, ...sampleHeldOrders]}
        dispatch={dispatch}
      />

      <KeyboardShortcutsModal
        isOpen={showKeyboardShortcuts}
        onClose={() => setShowKeyboardShortcuts(false)}
      />

      <Modal open={showReceipt} onClose={handleClearAfterReceipt} size="sm">
        <div className="p-4 text-center">
          <div className="w-14 h-14 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-3">
            <FiCheck className="w-7 h-7 text-success" />
          </div>
          <h2 className="text-lg font-bold font-heading">
            Payment Successful!
          </h2>
          <p className="text-sm text-foreground-muted mt-0.5">
            {lastOrder?.order_number}
          </p>
        </div>

        {lastOrder && (
          <div className="bg-background-tertiary rounded-xl mx-4 mb-4 p-4 text-xs space-y-2 font-mono">
            <div className="flex items-center justify-center gap-2 mb-3 pb-3 border-b border-border">
              <span className="text-2xl">{STORE_INFO.logo}</span>
              <div className="text-center">
                <p className="text-sm font-bold font-heading">
                  {STORE_INFO.name}
                </p>
                <p className="text-[10px] text-foreground-muted">
                  {STORE_INFO.address}
                </p>
                <p className="text-[10px] text-foreground-muted">
                  Tel: {STORE_INFO.phone}
                </p>
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-foreground-muted">Invoice:</span>
              <span className="font-medium">{lastOrder.order_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-foreground-muted">Date:</span>
              <span>{lastOrder.date}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-foreground-muted">Cashier:</span>
              <span>{lastOrder.cashier}</span>
            </div>
            <div className="border-t border-border my-2" />
            <div className="flex justify-between text-[10px] text-foreground-muted pb-1">
              <span className="flex-1">Item</span>
              <span className="w-8 text-center">Qty</span>
              <span className="w-16 text-right">Total</span>
            </div>
            <div className="border-t border-border" />
            {(cart.length > 0 ? cart : lastOrder.items || []).map((item, i) => (
              <div key={i} className="flex justify-between text-[11px]">
                <span className="flex-1 truncate">
                  {item.product_name || item.name}
                </span>
                <span className="w-8 text-center text-foreground-muted">
                  x{item.quantity}
                </span>
                <span className="w-16 text-right tabular-nums">
                  {formatCurrency(item.price * item.quantity)}
                </span>
              </div>
            ))}
            <div className="border-t border-border mt-2 pt-2 space-y-1">
              <div className="flex justify-between">
                <span className="text-foreground-muted">Subtotal</span>
                <span className="tabular-nums">
                  {formatCurrency(lastOrder.subtotal || subtotal)}
                </span>
              </div>
              {(lastOrder.discount || discountAmount) > 0 && (
                <div className="flex justify-between">
                  <span className="text-foreground-muted">Discount</span>
                  <span className="text-success tabular-nums">
                    -{formatCurrency(lastOrder.discount || discountAmount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-foreground-muted">Tax</span>
                <span className="tabular-nums">
                  {formatCurrency(lastOrder.tax || tax)}
                </span>
              </div>
              <div className="flex justify-between text-sm font-bold border-t border-border pt-1">
                <span>Total</span>
                <span className="text-accent tabular-nums">
                  {formatCurrency(lastOrder.total || grandTotal)}
                </span>
              </div>
            </div>
            <div className="border-t border-border pt-2 flex justify-between">
              <span className="text-foreground-muted">Payment</span>
              <Badge variant="success" className="text-[10px] capitalize">
                {lastOrder.payment_method || selectedPayment}
              </Badge>
            </div>
            {receiptQRValue && (
              <div className="flex justify-center pt-2">
                <div className="bg-white rounded-lg p-2">
                  <QRCodeCanvas value={receiptQRValue} size={80} level="H" />
                </div>
              </div>
            )}
            <div className="text-center text-[10px] text-foreground-muted pt-2 border-t border-border">
              <p>Thank you for your purchase!</p>
              <p>Visit us again!</p>
            </div>
          </div>
        )}

        <div className="px-4 pb-4 flex gap-3">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => handlePrintReceipt()}
          >
            <FiPrinter className="w-4 h-4 mr-2" /> Print
          </Button>
          <Button
            variant="secondary"
            className="flex-1"
            onClick={handlePrintPreview}
          >
            <FiPrinter className="w-4 h-4 mr-2" /> Preview
          </Button>
          <Button className="flex-1" onClick={handleClearAfterReceipt}>
            <FiShoppingCart className="w-4 h-4 mr-2" /> New Order
          </Button>
        </div>
      </Modal>

      <PrintReceipt
        isOpen={showPrintPreviewModal}
        onClose={() => setShowPrintPreviewModal(false)}
        orderData={lastOrder}
        storeInfo={STORE_INFO}
      />

      <Modal
        open={showSuspended}
        onClose={() => setShowSuspended(false)}
        title="Suspended Orders"
        size="sm"
      >
        {suspendedOrders.length === 0 ? (
          <div className="text-center py-8 text-foreground-muted">
            <FiClock className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No suspended orders</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {suspendedOrders.map((order) => (
              <div
                key={order.id}
                className="flex items-center gap-3 p-3 bg-background-tertiary rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    {order.items.length} items
                  </p>
                  <p className="text-xs text-foreground-muted">
                    {order.time || order.date}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {order.items.slice(0, 3).map((item, i) => (
                      <span
                        key={i}
                        className="text-[10px] px-1.5 py-0.5 bg-background rounded"
                      >
                        {item.name}
                      </span>
                    ))}
                    {order.items.length > 3 && (
                      <span className="text-[10px] text-foreground-muted">
                        +{order.items.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">
                    {formatCurrency(order.total)}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleResume(order)}
                    className="p-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
                    title="Resume"
                  >
                    <FiPlay className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteSuspended(order.id)}
                    className="p-2 bg-danger/10 text-danger rounded-lg hover:bg-danger/20 transition-colors"
                    title="Delete"
                  >
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-4 text-xs text-foreground-muted text-center">
          {suspendedOrders.length} suspended order
          {suspendedOrders.length !== 1 ? "s" : ""}
        </div>
      </Modal>

      <AnimatePresence>
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-background-secondary rounded-2xl p-8 flex flex-col items-center"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full mb-3"
              />
              <p className="text-base font-medium">Processing Payment...</p>
              <p className="text-xs text-foreground-muted mt-1">Please wait</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
