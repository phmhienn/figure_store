import { createContext, useContext, useEffect, useState } from "react";

import { STORAGE_KEYS } from "../constants/storage";

const CartContext = createContext(null);

const dispatchAppToast = (payload) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("app-toast", { detail: payload }));
};

const readStoredCart = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.CART) || "[]");
  } catch (_error) {
    return [];
  }
};

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => readStoredCart());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(items));
  }, [items]);

  const addToCart = (product, quantity = 1) => {
    const safeQuantity = Math.max(1, Number(quantity) || 1);
    const productName = product?.name || "Sản phẩm";
    const existingItem = items.find(
      (item) => item.product_id === product.product_id,
    );
    const effectiveStock = Number(
      existingItem?.stock_quantity ?? product.stock_quantity,
    );

    const hasStockLimit = Number.isFinite(effectiveStock) && effectiveStock > 0;
    const reachedMaxQuantity =
      !!existingItem &&
      hasStockLimit &&
      existingItem.quantity >= effectiveStock;

    setItems((currentItems) => {
      const currentExistingItem = currentItems.find(
        (item) => item.product_id === product.product_id,
      );

      if (currentExistingItem) {
        const maxQuantity =
          Number(currentExistingItem.stock_quantity) ||
          Number(product.stock_quantity) ||
          currentExistingItem.quantity + safeQuantity;

        const nextQuantity = Math.min(
          currentExistingItem.quantity + safeQuantity,
          maxQuantity,
        );

        return currentItems.map((item) =>
          item.product_id === product.product_id
            ? {
                ...item,
                quantity: nextQuantity,
              }
            : item,
        );
      }

      const stockQuantity = Number(product.stock_quantity) || safeQuantity;
      const initialQuantity = Math.min(safeQuantity, stockQuantity);

      return [
        ...currentItems,
        {
          product_id: product.product_id,
          name: product.name,
          price: Number(product.price),
          image_url: product.image_url,
          stock_quantity: stockQuantity,
          quantity: initialQuantity,
        },
      ];
    });

    dispatchAppToast(
      reachedMaxQuantity
        ? {
            type: "error",
            text: `"${productName}" đã đạt số lượng tối đa trong giỏ hàng.`,
          }
        : {
            type: "success",
            text: existingItem
              ? `Đã cập nhật "${productName}" trong giỏ hàng.`
              : `Đã thêm "${productName}" vào giỏ hàng.`,
          },
    );
  };

  const updateQuantity = (productId, quantity) => {
    setItems((currentItems) =>
      currentItems
        .map((item) =>
          item.product_id === productId
            ? {
                ...item,
                quantity: Math.max(1, Math.min(quantity, item.stock_quantity)),
              }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  };

  const removeFromCart = (productId) => {
    setItems((currentItems) =>
      currentItems.filter((item) => item.product_id !== productId),
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const cartCount = items.reduce((total, item) => total + item.quantity, 0);
  const cartSubtotal = items.reduce(
    (total, item) => total + item.price * item.quantity,
    0,
  );

  const value = {
    items,
    cartCount,
    cartSubtotal,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used inside CartProvider");
  }

  return context;
};
