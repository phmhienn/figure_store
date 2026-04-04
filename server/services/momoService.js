const crypto = require("crypto");

const getEnv = (key) => String(process.env[key] || "").trim();

const getMomoConfig = () => {
  const partnerCode = getEnv("MOMO_PARTNER_CODE");
  const accessKey = getEnv("MOMO_ACCESS_KEY");
  const secretKey = getEnv("MOMO_SECRET_KEY");
  const clientUrl = getEnv("CLIENT_URL") || "http://localhost:5173";
  const port = Number(process.env.PORT || 5000);
  const serverUrl = getEnv("SERVER_URL") || `http://localhost:${port}`;

  if (!partnerCode || !accessKey || !secretKey) {
    throw new Error("MoMo configuration is missing");
  }

  return {
    partnerCode,
    accessKey,
    secretKey,
    apiUrl:
      getEnv("MOMO_API_URL") || "https://test-payment.momo.vn/v2/gateway/api/create",
    redirectUrl: getEnv("MOMO_REDIRECT_URL") || `${clientUrl}/preorder-lookup`,
    ipnUrl: getEnv("MOMO_IPN_URL") || `${serverUrl}/api/preorders/momo/ipn`,
  };
};

const signPayload = (rawSignature, secretKey) =>
  crypto.createHmac("sha256", secretKey).update(rawSignature).digest("hex");

const buildCreateSignature = ({
  accessKey,
  amount,
  extraData,
  ipnUrl,
  orderId,
  orderInfo,
  partnerCode,
  redirectUrl,
  requestId,
  requestType,
}) =>
  `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}` +
  `&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}` +
  `&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}` +
  `&requestId=${requestId}&requestType=${requestType}`;

const buildIpnSignature = ({
  accessKey,
  amount,
  extraData,
  message,
  orderId,
  orderInfo,
  orderType,
  partnerCode,
  payType,
  requestId,
  responseTime,
  resultCode,
  transId,
}) =>
  `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}` +
  `&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}` +
  `&orderType=${orderType}&partnerCode=${partnerCode}&payType=${payType}` +
  `&requestId=${requestId}&responseTime=${responseTime}` +
  `&resultCode=${resultCode}&transId=${transId}`;

const buildExtraData = (data) =>
  Buffer.from(JSON.stringify(data), "utf8").toString("base64");

const createPaymentUrl = async ({
  amount,
  orderId,
  orderInfo,
  requestId,
  extraData,
}) => {
  const config = getMomoConfig();
  const normalizedAmount = Math.round(Number(amount));

  if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
    throw new Error("Invalid payment amount");
  }

  const requestType = "payWithMethod";
  const encodedExtraData = extraData ? buildExtraData(extraData) : "";
  const rawSignature = buildCreateSignature({
    accessKey: config.accessKey,
    amount: normalizedAmount,
    extraData: encodedExtraData,
    ipnUrl: config.ipnUrl,
    orderId,
    orderInfo,
    partnerCode: config.partnerCode,
    redirectUrl: config.redirectUrl,
    requestId,
    requestType,
  });

  const payload = {
    partnerCode: config.partnerCode,
    partnerName: "KaFigure",
    storeId: "KaFigure",
    requestId,
    amount: normalizedAmount,
    orderId,
    orderInfo,
    redirectUrl: config.redirectUrl,
    ipnUrl: config.ipnUrl,
    lang: "vi",
    requestType,
    autoCapture: true,
    extraData: encodedExtraData,
    orderGroupId: "",
    signature: signPayload(rawSignature, config.secretKey),
  };

  if (getEnv("MOMO_DEBUG") === "true") {
    console.log("[MoMo] Payload:", payload);
    console.log("[MoMo] RawSignature:", rawSignature);
  }

  const response = await fetch(config.apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || "MoMo request failed");
  }

  if (data?.resultCode !== 0 || !data?.payUrl) {
    throw new Error(data?.message || "MoMo did not return a payment URL");
  }

  if (getEnv("MOMO_DEBUG") === "true") {
    console.log("[MoMo] Response:", data);
  }

  return data;
};

const verifyIpnSignature = (payload) => {
  const config = getMomoConfig();
  if (!payload?.signature) {
    return false;
  }

  const expectedSignature = signPayload(
    buildIpnSignature({
      accessKey: config.accessKey,
      amount: payload.amount,
      extraData: payload.extraData || "",
      message: payload.message || "",
      orderId: payload.orderId || "",
      orderInfo: payload.orderInfo || "",
      orderType: payload.orderType || "",
      partnerCode: payload.partnerCode || "",
      payType: payload.payType || "",
      requestId: payload.requestId || "",
      responseTime: payload.responseTime || "",
      resultCode: payload.resultCode ?? "",
      transId: payload.transId ?? "",
    }),
    config.secretKey,
  );

  return expectedSignature === payload.signature;
};

module.exports = {
  createPaymentUrl,
  verifyIpnSignature,
};
