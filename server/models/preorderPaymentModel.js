const pool = require("../config/db");

const create = async ({
  preorderId,
  method,
  status,
  amount,
  gatewayTxnRef,
  payUrl,
  responseRaw,
}) => {
  const [result] = await pool.execute(
    `
      INSERT INTO preorder_payments
        (preorder_id, method, status, amount, vnpay_txn_ref, pay_url, response_raw)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [preorderId, method, status, amount, gatewayTxnRef, payUrl, responseRaw],
  );

  return result.insertId;
};

const findByGatewayTxnRef = async (gatewayTxnRef) => {
  const [rows] = await pool.execute(
    "SELECT * FROM preorder_payments WHERE vnpay_txn_ref = ?",
    [gatewayTxnRef],
  );
  return rows[0] || null;
};

const markPaid = async ({
  paymentId,
  transactionNo,
  responseCode,
  responseRaw,
}) => {
  const [result] = await pool.execute(
    `
      UPDATE preorder_payments
      SET status = 'paid', vnpay_transaction_no = ?, vnpay_response_code = ?,
          paid_at = NOW(), response_raw = ?
      WHERE payment_id = ?
    `,
    [transactionNo, responseCode, responseRaw, paymentId],
  );

  return result.affectedRows > 0;
};

const markFailed = async ({ paymentId, responseRaw }) => {
  const [result] = await pool.execute(
    `
      UPDATE preorder_payments
      SET status = 'failed', response_raw = ?
      WHERE payment_id = ?
    `,
    [responseRaw, paymentId],
  );

  return result.affectedRows > 0;
};

module.exports = {
  create,
  findByGatewayTxnRef,
  markPaid,
  markFailed,
};
