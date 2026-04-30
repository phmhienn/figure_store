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
  const { rows } = await pool.query(
    `
      INSERT INTO preorder_payments
        (preorder_id, method, status, amount, vnpay_txn_ref, pay_url, response_raw)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING payment_id
    `,
    [preorderId, method, status, amount, gatewayTxnRef, payUrl, responseRaw],
  );

  return rows[0]?.payment_id;
};

const findByGatewayTxnRef = async (gatewayTxnRef) => {
  const { rows } = await pool.query(
    "SELECT * FROM preorder_payments WHERE vnpay_txn_ref = $1",
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
  const result = await pool.query(
    `
      UPDATE preorder_payments
      SET status = 'paid', vnpay_transaction_no = $1, vnpay_response_code = $2,
          paid_at = NOW(), response_raw = $3
      WHERE payment_id = $4
    `,
    [transactionNo, responseCode, responseRaw, paymentId],
  );

  return result.rowCount > 0;
};

const markFailed = async ({ paymentId, responseRaw }) => {
  const result = await pool.query(
    `
      UPDATE preorder_payments
      SET status = 'failed', response_raw = $1
      WHERE payment_id = $2
    `,
    [responseRaw, paymentId],
  );

  return result.rowCount > 0;
};

module.exports = {
  create,
  findByGatewayTxnRef,
  markPaid,
  markFailed,
};
