const pool = require("../config/db");

const findAll = async () => {
  const { rows } = await pool.query(
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
  const { rows: orders } = await pool.query(
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

  const { rows: items } = await pool.query(
    `
      SELECT oi.*, p.name AS product_name,
        COALESCE(
          (
            SELECT pi.image_url FROM product_images pi
            WHERE pi.product_id = p.product_id AND pi.is_main = TRUE
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
      WHERE oi.order_id = ANY($1)
      ORDER BY oi.order_item_id ASC
    `,
    [orderIds],
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
  const { rows: orderRows } = await pool.query(
    `
      SELECT o.*,
             a.receiver_name, a.phone AS address_phone,
             a.address_line, a.city, a.country
      FROM orders o
      LEFT JOIN addresses a ON a.address_id = o.address_id
      WHERE o.order_id = $1
    `,
    [id],
  );
  const order = orderRows[0];

  if (!order) {
    return null;
  }

  const { rows: itemRows } = await pool.query(
    `
      SELECT oi.*, p.name AS product_name,
        COALESCE(
          (
            SELECT pi.image_url FROM product_images pi
            WHERE pi.product_id = p.product_id AND pi.is_main = TRUE
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
      WHERE oi.order_id = $1
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
  const result = await pool.query(
    "UPDATE orders SET status = $1 WHERE order_id = $2",
    [status, id],
  );

  return result.rowCount > 0;
};

const createWithItems = async ({
  userId,
  recipient_name,
  phone,
  shipping_address,
  items,
}) => {
  const connection = await pool.connect();

  try {
    await connection.query("BEGIN");

    // Create a dedicated address snapshot for each order so old orders
    // are not affected when users place future orders with a new address.
    const { rows: addrRows } = await connection.query(
      `INSERT INTO addresses (user_id, receiver_name, phone, address_line, city, country, is_default)
       VALUES ($1, $2, $3, $4, '', '', FALSE)
       RETURNING address_id`,
      [userId, recipient_name, phone, shipping_address],
    );
    const addressId = addrRows[0].address_id;

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

    const { rows: products } = await connection.query(
      `
        SELECT product_id, name, price, stock_quantity
        FROM products
        WHERE product_id = ANY($1)
        FOR UPDATE
      `,
      [productIds],
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

    const { rows: orderRows } = await connection.query(
      `
        INSERT INTO orders (user_id, address_id, total_amount, status)
        VALUES ($1, $2, $3, 'pending')
        RETURNING order_id
      `,
      [userId, addressId, totalAmount],
    );
    const orderId = orderRows[0].order_id;

    for (const item of normalizedItems) {
      const product = productMap.get(item.product_id);

      await connection.query(
        `
          INSERT INTO order_items (order_id, product_id, quantity, price)
          VALUES ($1, $2, $3, $4)
        `,
        [orderId, product.product_id, item.quantity, product.price],
      );

      await connection.query(
        "UPDATE products SET stock_quantity = stock_quantity - $1 WHERE product_id = $2",
        [item.quantity, product.product_id],
      );
    }

    await connection.query("COMMIT");
    return findById(orderId);
  } catch (error) {
    await connection.query("ROLLBACK");
    throw error;
  } finally {
    connection.release();
  }
};

const findOrdersByUser = async (userId) => {
  const { rows: orders } = await pool.query(
    `
      SELECT o.*,
             a.receiver_name, a.phone AS address_phone,
             a.address_line, a.city, a.country
      FROM orders o
      LEFT JOIN addresses a ON a.address_id = o.address_id
      WHERE o.user_id = $1
      ORDER BY o.created_at DESC, o.order_id DESC
    `,
    [userId],
  );

  if (!orders.length) {
    return [];
  }

  const orderIds = orders.map((order) => order.order_id);

  const { rows: items } = await pool.query(
    `
      SELECT oi.*, p.name AS product_name,
        COALESCE(
          (
            SELECT pi.image_url FROM product_images pi
            WHERE pi.product_id = p.product_id AND pi.is_main = TRUE
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
      WHERE oi.order_id = ANY($1)
      ORDER BY oi.order_item_id ASC
    `,
    [orderIds],
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
