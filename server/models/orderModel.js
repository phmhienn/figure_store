const pool = require("../config/db");

const findAll = async () => {
  const [rows] = await pool.execute(
    `
      SELECT o.*, u.username, u.email,
             a.receiver_name, a.phone AS address_phone,
             a.address_line, a.city, a.country
      FROM orders o
      JOIN users u ON u.user_id = o.user_id
      LEFT JOIN addresses a ON a.address_id = o.address_id
      ORDER BY o.created_at DESC, o.order_id DESC
    `,
  );
  return rows;
};

const findAllWithItems = async () => {
  const [orders] = await pool.execute(
    `
      SELECT o.*, u.username, u.email,
             a.receiver_name, a.phone AS address_phone,
             a.address_line, a.city, a.country
      FROM orders o
      JOIN users u ON u.user_id = o.user_id
      LEFT JOIN addresses a ON a.address_id = o.address_id
      ORDER BY o.created_at DESC, o.order_id DESC
    `,
  );

  if (!orders.length) {
    return [];
  }

  const orderIds = orders.map((order) => order.order_id);
  const placeholders = orderIds.map(() => "?").join(", ");

  const [items] = await pool.execute(
    `
      SELECT oi.*, p.name AS product_name,
        COALESCE(
          (
            SELECT pi.image_url FROM product_images pi
            WHERE pi.product_id = p.product_id AND pi.is_main = 1
            ORDER BY pi.image_id ASC LIMIT 1
          ),
          (
            SELECT pi.image_url FROM product_images pi
            WHERE pi.product_id = p.product_id
            ORDER BY pi.image_id ASC LIMIT 1
          )
        ) AS image_url
      FROM order_items oi
      JOIN products p ON p.product_id = oi.product_id
      WHERE oi.order_id IN (${placeholders})
      ORDER BY oi.order_item_id ASC
    `,
    orderIds,
  );

  const itemMap = items.reduce((accumulator, item) => {
    if (!accumulator[item.order_id]) {
      accumulator[item.order_id] = [];
    }

    accumulator[item.order_id].push(item);
    return accumulator;
  }, {});

  return orders.map((order) => ({
    ...order,
    recipient_name: order.receiver_name,
    shipping_address: [order.address_line, order.city, order.country]
      .filter(Boolean)
      .join(", "),
    items: itemMap[order.order_id] || [],
  }));
};

const findById = async (id) => {
  const [orderRows] = await pool.execute(
    `
      SELECT o.*,
             a.receiver_name, a.phone AS address_phone,
             a.address_line, a.city, a.country
      FROM orders o
      LEFT JOIN addresses a ON a.address_id = o.address_id
      WHERE o.order_id = ?
    `,
    [id],
  );
  const order = orderRows[0];

  if (!order) {
    return null;
  }

  const [itemRows] = await pool.execute(
    `
      SELECT oi.*, p.name AS product_name,
        COALESCE(
          (
            SELECT pi.image_url FROM product_images pi
            WHERE pi.product_id = p.product_id AND pi.is_main = 1
            ORDER BY pi.image_id ASC LIMIT 1
          ),
          (
            SELECT pi.image_url FROM product_images pi
            WHERE pi.product_id = p.product_id
            ORDER BY pi.image_id ASC LIMIT 1
          )
        ) AS image_url
      FROM order_items oi
      JOIN products p ON p.product_id = oi.product_id
      WHERE oi.order_id = ?
      ORDER BY oi.order_item_id ASC
    `,
    [id],
  );

  return {
    ...order,
    items: itemRows,
  };
};

const updateStatus = async (id, status) => {
  const [result] = await pool.execute(
    "UPDATE orders SET status = ? WHERE order_id = ?",
    [status, id],
  );

  return result.affectedRows > 0;
};

const createWithItems = async ({
  userId,
  recipient_name,
  phone,
  shipping_address,
  items,
}) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Create a dedicated address snapshot for each order so old orders
    // are not affected when users place future orders with a new address.
    const [addrResult] = await connection.execute(
      `INSERT INTO addresses (user_id, receiver_name, phone, address_line, city, country, is_default)
       VALUES (?, ?, ?, ?, '', '', 0)`,
      [userId, recipient_name, phone, shipping_address],
    );
    const addressId = addrResult.insertId;

    // Normalize items (merge duplicates)
    const normalizedItems = items.reduce((accumulator, item) => {
      const productId = Number(item.product_id);
      const quantity = Number(item.quantity);

      if (!productId || quantity <= 0) {
        throw new Error("Invalid order item payload.");
      }

      const existingItem = accumulator.find(
        (entry) => entry.product_id === productId,
      );

      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        accumulator.push({ product_id: productId, quantity });
      }

      return accumulator;
    }, []);

    const productIds = normalizedItems.map((item) => item.product_id);
    const placeholders = productIds.map(() => "?").join(", ");

    const [products] = await connection.execute(
      `
        SELECT product_id, name, price, stock_quantity
        FROM products
        WHERE product_id IN (${placeholders})
        FOR UPDATE
      `,
      productIds,
    );

    if (products.length !== productIds.length) {
      throw new Error("One or more selected products do not exist.");
    }

    const productMap = new Map(
      products.map((product) => [product.product_id, product]),
    );
    let totalAmount = 0;

    for (const item of normalizedItems) {
      const product = productMap.get(item.product_id);

      if (product.stock_quantity < item.quantity) {
        throw new Error(
          `Product "${product.name}" does not have enough stock.`,
        );
      }

      totalAmount += Number(product.price) * item.quantity;
    }

    const [orderResult] = await connection.execute(
      `
        INSERT INTO orders (user_id, address_id, total_amount, status)
        VALUES (?, ?, ?, 'pending')
      `,
      [userId, addressId, totalAmount],
    );

    for (const item of normalizedItems) {
      const product = productMap.get(item.product_id);

      await connection.execute(
        `
          INSERT INTO order_items (order_id, product_id, quantity, price)
          VALUES (?, ?, ?, ?)
        `,
        [
          orderResult.insertId,
          product.product_id,
          item.quantity,
          product.price,
        ],
      );

      await connection.execute(
        "UPDATE products SET stock_quantity = stock_quantity - ? WHERE product_id = ?",
        [item.quantity, product.product_id],
      );
    }

    await connection.commit();
    return findById(orderResult.insertId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const findOrdersByUser = async (userId) => {
  const [orders] = await pool.execute(
    `
      SELECT o.*,
             a.receiver_name, a.phone AS address_phone,
             a.address_line, a.city, a.country
      FROM orders o
      LEFT JOIN addresses a ON a.address_id = o.address_id
      WHERE o.user_id = ?
      ORDER BY o.created_at DESC, o.order_id DESC
    `,
    [userId],
  );

  if (!orders.length) {
    return [];
  }

  const orderIds = orders.map((order) => order.order_id);
  const placeholders = orderIds.map(() => "?").join(", ");

  const [items] = await pool.execute(
    `
      SELECT oi.*, p.name AS product_name,
        COALESCE(
          (
            SELECT pi.image_url FROM product_images pi
            WHERE pi.product_id = p.product_id AND pi.is_main = 1
            ORDER BY pi.image_id ASC LIMIT 1
          ),
          (
            SELECT pi.image_url FROM product_images pi
            WHERE pi.product_id = p.product_id
            ORDER BY pi.image_id ASC LIMIT 1
          )
        ) AS image_url
      FROM order_items oi
      JOIN products p ON p.product_id = oi.product_id
      WHERE oi.order_id IN (${placeholders})
      ORDER BY oi.order_item_id ASC
    `,
    orderIds,
  );

  const itemMap = items.reduce((accumulator, item) => {
    if (!accumulator[item.order_id]) {
      accumulator[item.order_id] = [];
    }

    accumulator[item.order_id].push(item);
    return accumulator;
  }, {});

  return orders.map((order) => ({
    ...order,
    // Map address fields for frontend compatibility
    recipient_name: order.receiver_name,
    shipping_address: [order.address_line, order.city, order.country]
      .filter(Boolean)
      .join(", "),
    items: itemMap[order.order_id] || [],
  }));
};

module.exports = {
  findAll,
  findAllWithItems,
  findById,
  createWithItems,
  findOrdersByUser,
  updateStatus,
};
