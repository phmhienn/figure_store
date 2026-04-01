import { createContext, useContext, useEffect, useState } from "react";

import { STORAGE_KEYS } from "../constants/storage";

const CartContext = createContext(null);

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
    setItems((currentItems) => {
      const existingItem = currentItems.find(
        (item) => item.product_id === product.product_id,
      );

      if (existingItem) {
        return currentItems.map((item) =>
          item.product_id === product.product_id
            ? {
                ...item,
                quantity: Math.min(
                  item.quantity + quantity,
                  item.stock_quantity,
                ),
              }
            : item,
        );
      }

      return [
        ...currentItems,
        {
          product_id: product.product_id,
          name: product.name,
          price: Number(product.price),
          image_url: product.image_url,
          stock_quantity: Number(product.stock_quantity),
          quantity: Math.min(
            quantity,
            Number(product.stock_quantity) || quantity,
          ),
        },
      ];
    });
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
