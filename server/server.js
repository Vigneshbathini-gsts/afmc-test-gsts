const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const session = require("express-session");
const MySQLSession = require("express-mysql-session");
const timeout = require("connect-timeout");
const publicCatalogImage = require("./middleware/publicCatalogImage");
const { createNetworkGuardMiddleware, isNetworkError, buildRetryableErrorResponse } = require("./utils/asyncHandler");
const authMiddleware = require("./middleware/authMiddleware");
const csrfProtection = require("./middleware/csrfProtection");
const logger = require("./utils/logger");

const isProduction = process.env.NODE_ENV === "production";
if (isProduction) {
  console.log = () => logger.info("Legacy console log suppressed");
  console.error = () => logger.error("Legacy console error suppressed");
}
const requiredSecret = (name, minimum = 32) => {
  const value = process.env[name];
  const isPlaceholder = /^(?:secret|changeme|change-me|default|your-secret-key|replace[_ -]with[_ -].*)$/i.test(
    value || ""
  );
  if (!value || value.length < minimum || isPlaceholder) {
    throw new Error(`${name} must be configured with at least ${minimum} non-default characters`);
  }
  return value;
};
const SESSION_SECRET = requiredSecret("SESSION_SECRET");
requiredSecret("JWT_SECRET");

const app = express();
app.set("trust proxy", isProduction ? 1 : false);
const BASE_PATH = `/${(process.env.BASE_PATH || "AFMCMESSTEST").replace(
  /^\/+|\/+$/g,
  "",
)}`;
const API_BASE_PATH = `${BASE_PATH}/api`;

require("./config/db");

const MySQLStore = MySQLSession(session);
const sessionStore = new MySQLStore({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  clearExpired: true,
  checkExpirationInterval: 15 * 60 * 1000, // 15 min
  expiration: 24 * 60 * 60 * 1000, // 24 hours
  createDatabaseTable: true,
  schema: {
    tableName: process.env.SESSION_TABLE_NAME || "sessions",
    columnNames: {
      session_id: "session_id",
      expires: "expires",
      data: "data",
    },
  },
});

app.use(
  session({
    store: sessionStore,
    name: process.env.SESSION_COOKIE_NAME || "afmc.sid",
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: isProduction,
      httpOnly: true,
      sameSite: process.env.COOKIE_SAME_SITE || (isProduction ? "none" : "lax"),
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

app.use(
  cors({
    origin: (process.env.CORS_ORIGIN || (isProduction ? "" : "http://localhost:3000,http://localhost:5173"))
      .split(",").map((s) => s.trim()).filter(Boolean),
    credentials: true,
  })
);

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      frameAncestors: ["'none'"],
      objectSrc: ["'none'"],
      imgSrc: ["'self'", "data:", "https:"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", ...(process.env.CSP_CONNECT_SRC || "").split(",").map((s) => s.trim()).filter(Boolean)],
    },
  },
  referrerPolicy: { policy: "no-referrer" },
  hsts: isProduction ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
}));

const REQUEST_TIMEOUT_SECONDS = Number(process.env.REQUEST_TIMEOUT_SECONDS || 10);

//Global Gateway Request Timeouts
app.use(timeout(`${REQUEST_TIMEOUT_SECONDS}s`));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "100kb" }));
app.use(createNetworkGuardMiddleware());

// Timeout Halt Validator Middleware
const haltOnTimeout = (req, res, next) => {
  if (req.timedout) {
    if (!res.headersSent) {
      return res.status(503).json({
        success: false,
        message: "The request took too long. Please retry.",
        code: "GATEWAY_TIMEOUT",
      });
    }
    return;
  }

  next();
};

app.get(
  ["/uploads/:filename", `${BASE_PATH}/uploads/:filename`, `${BASE_PATH}/:filename`],
  haltOnTimeout,
  publicCatalogImage
);

app.get("/", haltOnTimeout, (req, res) => {
  res.json({ status: "Server is running", basePath: BASE_PATH, apiBasePath: API_BASE_PATH });
});
app.get(BASE_PATH, haltOnTimeout, (req, res) => {
  res.json({ status: "Server is running", basePath: BASE_PATH, apiBasePath: API_BASE_PATH });
});

const authRoutes = require("./routes/authRoutes");
const reportRoutes = require("./routes/reportRoutes");
const cocktailRoutes = require("./routes/cocktailRoutes");
const userRoutes = require("./routes/userRoutes");
const orderRoutes = require("./routes/orderRoutes");
const KitchenOrdersRoutes = require("./routes/KitchenOrdersRoutes");
const collectionRoutes = require("./routes/collectionRoutes");
const priceRoutes = require("./routes/priceRoutes");
const offerRoutes = require("./routes/offerRoutes");
const inventoryRoutes = require("./routes/inventoryRoutes");
const cartRoutes = require("./modules/cart/cartRoutes");
const profitRoutes = require("./routes/profitRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const cancelledOrdersRoutes = require("./routes/cancelledOrdersRoutes");
const menuRoutesbeer = require("./routes/MenuRoutesbeer");
const Pubmenubuyroutes = require("./modules/pubmenubuy/Pubmenubuyroutes");
const ConfirmOrderroutes = require("./routes/ConfirmOrderroutes");
const invoiceRoutes = require("./modules/invoice/invoiceRoutes");
const InvoiceReportroute = require("./modules/invoice-report/InvoiceReportroute");
const orderHistoryRoutes = require("./routes/orderHistoryRoutes");
const paymentRoutes = require("./modules/payment/paymentRoutes");
const orderEvents = require("./utils/orderEvents");
const barStatusRoutes = require("./routes/BarStatusRoutes");
const messTimingsRoutes = require("./routes/MessTimingsRoutes");

const apiPrefixes = ["/api", API_BASE_PATH];
for (const prefix of apiPrefixes) {
  // Protect every API endpoint by default. Only authentication bootstrap
  // endpoints, the read-only mess status endpoint, and SSE endpoints with
  // their own token validation are public at this layer.
  app.use(prefix, csrfProtection, (req, res, next) => {
    const publicPaths = new Set([
      "/auth/login",
      "/auth/get-role",
      "/auth/forgot-password",
      "/auth/reset-password",
      "/mess-timings/status",
    ]);

    if (publicPaths.has(req.path)) {
      return next();
    }

    return authMiddleware(req, res, next);
  });

  // Attached haltOnTimeout guard specifically before custom app business endpoints
  app.use(`${prefix}/auth`, haltOnTimeout, authRoutes);
  app.use(`${prefix}/reports`, haltOnTimeout, reportRoutes);
  app.use(`${prefix}/cocktails`, haltOnTimeout, cocktailRoutes);
  app.use(`${prefix}/users`, haltOnTimeout, userRoutes);
  app.use(`${prefix}/orders`, haltOnTimeout, orderRoutes);
  app.use(`${prefix}/bar-orders`, haltOnTimeout, KitchenOrdersRoutes);
  app.use(`${prefix}/collection`, haltOnTimeout, collectionRoutes);
  app.use(`${prefix}/price`, haltOnTimeout, priceRoutes);
  app.use(`${prefix}/offers`, haltOnTimeout, offerRoutes);
  app.use(`${prefix}/inventory`, haltOnTimeout, inventoryRoutes);
  app.use(`${prefix}/cart`, haltOnTimeout, cartRoutes);
  app.use(`${prefix}/profit`, haltOnTimeout, profitRoutes);
  app.use(`${prefix}/notifications`, haltOnTimeout, notificationRoutes);
  app.use(`${prefix}/cancelled-orders`, haltOnTimeout, cancelledOrdersRoutes);
  app.use(`${prefix}/mess-timings`, haltOnTimeout, messTimingsRoutes);
  
  app.use(prefix, haltOnTimeout, menuRoutesbeer);
  app.use(prefix, haltOnTimeout, Pubmenubuyroutes);
  app.use(prefix, haltOnTimeout, ConfirmOrderroutes);
  app.use(`${prefix}/invoice`, haltOnTimeout, invoiceRoutes);
  app.use(`${prefix}/invoice-report`, haltOnTimeout, InvoiceReportroute);
  app.use(`${prefix}/order-history`, haltOnTimeout, orderHistoryRoutes);
  app.use(`${prefix}/payment`, haltOnTimeout, paymentRoutes);
  app.get(`${prefix}/order-events`, orderEvents.subscribe);
  app.use(`${prefix}/bar-status`, haltOnTimeout, barStatusRoutes);
}

// Global Custom Error Middleware (Catches timeout exceptions and file rules)
app.use((err, req, res, next) => {
  if (req.timedout || err?.timeout || err?.code === "ETIMEDOUT") {
    return res.status(503).json({
      success: false,
      message: "The request took too long. Please retry.",
      code: "GATEWAY_TIMEOUT",
    });
  }

  if (isNetworkError(err)) {
    return res.status(503).json(buildRetryableErrorResponse(err));
  }

  if (!err) return next();

  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ success: false, message: "Image size must be 2MB or less." });
  }
  if (err.message === "Only JPG image files are allowed.") {
    return res.status(400).json({ success: false, message: err.message });
  }

  logger.error("Unhandled request error", { code: err.code || "UNKNOWN" });
  return res.status(500).json({
    success: false,
    message: "The request could not be completed.",
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => logger.info("Server listening"));
