const crypto = require("crypto");

const getEnv = (key) => String(process.env[key] || "").trim();

const getVnpayConfig = () => {
  const tmnCode = getEnv("VNP_TMN_CODE");
  const hashSecret = getEnv("VNP_HASH_SECRET");
  const vnpUrl =
    getEnv("VNP_URL") || "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
  const clientUrl = getEnv("CLIENT_URL") || "http://localhost:5174";
  const port = Number(process.env.PORT || 5000);
  const serverUrl = getEnv("SERVER_URL") || `http://localhost:${port}`;
  const returnUrl = getEnv("VNP_RETURN_URL") || `${clientUrl}/preorder-lookup`;
  const ipnUrl =
    getEnv("VNP_IPN_URL") || `${serverUrl}/api/preorders/vnpay/ipn`;

  if (!tmnCode || !hashSecret) {
    throw new Error("VNPay configuration is missing");
  }

  return {
    tmnCode,
    hashSecret,
    vnpUrl,
    returnUrl,
    ipnUrl,
  };
};

const formatDate = (date = new Date()) => {
  const pad = (value) => String(value).padStart(2, "0");
  return (
    date.getFullYear() +
    pad(date.getMonth() + 1) +
    pad(date.getDate()) +
    pad(date.getHours()) +
    pad(date.getMinutes()) +
    pad(date.getSeconds())
  );
};

const encodeValue = (value) => encodeURIComponent(String(value));

const filterParams = (params) => {
  const filtered = {};
  Object.keys(params).forEach((key) => {
    const value = params[key];
    if (value === null || value === undefined || value === "") {
      return;
    }
    filtered[key] = value;
  });
  return filtered;
};

const sortParams = (params) => {
  const sorted = {};
  Object.keys(params)
    .sort()
    .forEach((key) => {
      sorted[key] = params[key];
    });
  return sorted;
};

const buildSignData = (params) =>
  Object.keys(params)
    .map((key) => `${key}=${params[key]}`)
    .join("&");

const buildQuery = (params) =>
  Object.keys(params)
    .map((key) => `${key}=${encodeValue(params[key])}`)
    .join("&");

const signParams = (params, secret) => {
  const signData = buildSignData(params);
  return crypto.createHmac("sha512", secret).update(signData).digest("hex");
};

const createPaymentUrl = ({ amount, orderId, orderInfo, ipAddr }) => {
  const config = getVnpayConfig();
  const vnpParams = filterParams({
    vnp_Version: "2.1.0",
    vnp_Command: "pay",
    vnp_TmnCode: config.tmnCode,
    vnp_Amount: String(Math.round(Number(amount) * 100)),
    vnp_CurrCode: "VND",
    vnp_TxnRef: orderId,
    vnp_OrderInfo: orderInfo,
    vnp_OrderType: "other",
    vnp_Locale: "vn",
    vnp_ReturnUrl: config.returnUrl,
    vnp_IpAddr: ipAddr || "127.0.0.1",
    vnp_CreateDate: formatDate(),
  });

  const sorted = sortParams(vnpParams);
  const signature = signParams(sorted, config.hashSecret);
  const query = buildQuery({
    ...sorted,
    vnp_SecureHash: signature,
  });

  if (getEnv("VNP_DEBUG") === "true") {
    console.log("[VNPay] Params:", sorted);
    console.log("[VNPay] SignData:", buildSignData(sorted));
    console.log("[VNPay] Signature:", signature);
  }

  return `${config.vnpUrl}?${query}`;
};

const verifyIpnSignature = (query) => {
  const config = getVnpayConfig();
  const { vnp_SecureHash, vnp_SecureHashType, ...rest } = query;

  if (!vnp_SecureHash) {
    return false;
  }

  const sorted = sortParams(filterParams(rest));
  const signature = signParams(sorted, config.hashSecret);
  return signature === vnp_SecureHash;
};

module.exports = {
  createPaymentUrl,
  verifyIpnSignature,
};
