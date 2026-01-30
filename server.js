// import express from "express";
// import bodyParser from "body-parser";
// import Razorpay from "razorpay";
// import crypto from "crypto";
// import dotenv from "dotenv";
// import cors from "cors";
// import prisma from "./utils/prisma.js";
// import session from "express-session";

// dotenv.config();

// const app = express();

// app.use(
//   session({
//     secret: process.env.SESSION_SECRET,
//     resave: false,
//     saveUninitialized: false,
//   })
// );


// // =====================
// // MIDDLEWARE
// // =====================

// // 1️⃣ RAW body for Razorpay webhook (must come first)
// app.use("/razorpay/webhook", bodyParser.raw({ type: "*/*" }));

// // 2️⃣ JSON parser for other routes
// app.use(bodyParser.json());
// app.use(express.urlencoded({ extended: true }));

// // 3️⃣ Enable CORS
// app.use(cors());

// // =====================
// // Razorpay client
// // =====================
// const razorpay = new Razorpay({
//   key_id: process.env.RAZORPAY_KEY,
//   key_secret: process.env.RAZORPAY_SECRET
// });

// // =====================
// // In-memory "DB" to store subscriptions (demo only)
// // =====================
// const subscriptionsDB = [];

// // =====================
// // Product → Razorpay Plan Mapping
// // =====================
// const productPlanMap = {
//   "Green Juice | 1 L": process.env.GREEN_JUICE_PLAN,
//   "Oatmeal Bowl 300 g": process.env.OATMEAL_BOWL_PLAN,
//   "Protein Shake": process.env.PROTEIN_SHAKE_PLAN,
//   // add all 25 products here
// };

// // =====================
// // Set EJS
// // =====================
// app.set("view engine", "ejs");

// // =====================
// // Routes
// // =====================
// function adminAuth(req, res, next) {
//   if (req.session.admin) {
//     return next();
//   }
//   return res.redirect("/admin/login");
// }
// function isAdmin(req, res, next) {
//   if (req.session && req.session.isAdmin) {
//     return next();
//   }
//   return res.redirect("/admin/login");
// }


// app.get("/admin/login", (req, res) => {
//   res.render("admin-login", { error: null });
// });



// app.post("/admin/login", (req, res) => {
//   const { email, password } = req.body;

//   if (
//     email === process.env.ADMIN_EMAIL &&
//     password === process.env.ADMIN_PASSWORD
//   ) {
//     req.session.admin = true;
//     req.session.isAdmin = true;
//     return res.redirect("/subscriptions");
//   }

//   res.render("admin-login", { error: "Invalid credentials" });
// });
// app.get("/admin/logout", (req, res) => {
//   req.session.destroy(() => {
//     res.redirect("/admin/login");
//   });
// });
// app.post("/admin/subscription/cancel", isAdmin, async (req, res) => {
//   try {
//     const { subscription_id } = req.body;

//     await razorpay.subscriptions.cancel(subscription_id);

//     // Update DB
//     await prisma.subscription.update({
//       where: { razorpaySubscription: subscription_id },
//       data: {
//         status: "cancelled",
//         cancelledAt: new Date(),
//       },
//     });

//     res.redirect("/subscriptions");
//   } catch (err) {
//     console.error("Cancel failed:", err);
//     res.status(500).send("Failed to cancel subscription");
//   }
// });

// // Health check
// app.get("/", (req, res) => {
//   res.send("Healthy Food Subscription Backend ✅");
// });

// // Show all subscriptions (admin view)
// // app.get("/subscriptions", async (req, res) => {
// //   try {
// //     const razorpaySubs = await razorpay.subscriptions.all({ count: 10 });

// //     // Fetch customer info for each subscription
// //     const subscriptions = await Promise.all(
// //       razorpaySubs.items.map(async (sub) => {
// //         let customerName = "N/A";
// //         let customerEmail = "N/A";
// //         let customerContact = "N/A";

// //         try {
// //           if (sub.customer_id) {
// //             const customer = await razorpay.customers.fetch(sub.customer_id);
// //             customerName = customer.name || "N/A";
// //             customerEmail = customer.email || "N/A";
// //             customerContact = customer.contact || "N/A";
// //           }
// //         } catch (err) {
// //           console.error("❌ Failed to fetch customer:", sub.customer_id, err);
// //         }

// //         return {
// //           customer_name: customerName,
// //           email: customerEmail,
// //           contact: customerContact,
// //           product: sub.notes?.product || "N/A",
// //           frequency: sub.notes?.frequency || "N/A",
// //           razorpay_subscription_id: sub.id,
// //           status: sub.status,
// //         };
// //       })
// //     );

// //     res.render("subscriptions", { subscriptions });
// //   } catch (err) {
// //     console.error("❌ Fetch subscriptions failed:", err);
// //     res.status(500).send("Failed to fetch subscriptions");
// //   }
// // });
// app.get("/subscriptions",adminAuth, async (req, res) => {
//   try {
//     const subscriptions = await prisma.subscription.findMany({
//       orderBy: {
//         createdAt: "desc",
//       },
//       include: {
//         customer: true,
//       },
//       take: 30,
//     });

//     const formatted = subscriptions.map(sub => ({
//       customer_name: sub.customer.name,
//       email: sub.customer.email,
//       contact: sub.customer.contact || "N/A",
//       product: sub.product,
//       frequency: sub.frequency,
//       razorpay_subscription_id: sub.razorpaySubscription,
//       status: sub.status,
//       created_at: sub.createdAt,
//       cancelled_at: sub.cancelledAt,
//     }));

//     res.render("subscriptions", { subscriptions: formatted });
//   } catch (err) {
//     console.error("❌ Fetch subscriptions from DB failed:", err);
//     res.status(500).send("Failed to fetch subscriptions");
//   }
// });
// // ==========================
// // Show all Razorpay Plans (Admin)
// // ==========================
// app.get("/admin/plans", isAdmin, async (req, res) => {
//   try {
//     // Fetch all Razorpay plans (up to 50)
//     const razorpayPlans = await razorpay.plans.all({ count: 50 });

//     // Filter plans that include notes.product_id (or notes.product)
//     const plans = razorpayPlans.items
//       .filter(plan => plan.notes && plan.notes.product_id) // filter by your notes key
//       .map(plan => ({
//         id: plan.id,
//         name: plan.item.name,
//         product: plan.notes.product_id || plan.item.description,
//         amount: (plan.item.amount / 100).toFixed(2), // paise → rupees
//         period: plan.period,
//         interval: plan.interval,
//         status: plan.status,
//         created_at: new Date(plan.created_at * 1000).toLocaleString(),
//       }));

//     res.render("plans", { plans });
//   } catch (err) {
//     console.error("❌ Failed to fetch Razorpay plans:", err);
//     res.status(500).send("Failed to fetch plans");
//   }
// });



// // ==========================
// // Route: Check existing subscription
// // ==========================
// // ==========================
// // Route: Check existing subscription (DB only)
// // ==========================
// app.post("/check-subscription", async (req, res) => {
//   try {
//     const { email, product } = req.body;

//     if (!email || !product) {
//       return res.status(400).json({ error: "Missing required fields" });
//     }

//     // 1️⃣ Find customer by email
//     const customer = await prisma.customer.findUnique({
//       where: { email },
//       include: { subscriptions: true },
//     });

//     if (!customer) {
//       return res.json({ exists: false });
//     }

//     // 2️⃣ Check for an active subscription for this product
//     const activeSub = customer.subscriptions.find(
//       sub => sub.product === product && sub.status !== "cancelled"
//     );

//     if (activeSub) {
//       return res.json({
//         exists: true,
//         subscription_id: activeSub.razorpaySubscription,
//         frequency: activeSub.frequency,
//       });
//     }

//     res.json({ exists: false });
//   } catch (err) {
//     console.error("❌ Check subscription failed:", err);
//     res.status(500).json({ error: "Check subscription failed" });
//   }
// });




// // helper to get customer id by email
// async function getCustomerIdByEmail(email) {
//   const customers = await razorpay.customers.all({ email });
//   return customers.items.length > 0 ? customers.items[0].id : null;
// }


// // =====================
// // Create Razorpay Subscription
// // =====================
// app.post("/create-subscription", async (req, res) => {
//   try {
//     const { name, email, contact, product, frequency } = req.body;

//     if (!productPlanMap[product]) {
//       return res.status(400).json({ error: "Product plan not found" });
//     }

//     const plan_id = productPlanMap[product];

//     // 1️⃣ Get or create Razorpay customer
//     let razorpayCustomer;
//     const existingRzCustomers = await razorpay.customers.all({ email });

//     if (existingRzCustomers.items.length > 0) {
//       razorpayCustomer = existingRzCustomers.items[0];
//     } else {
//       razorpayCustomer = await razorpay.customers.create({ name, email, contact });
//     }

//     // 2️⃣ Find or create DB customer safely
//     let dbCustomer = await prisma.customer.findUnique({ where: { email } });

//     if (!dbCustomer) {
//       // Customer does not exist → create safely
//       dbCustomer = await prisma.customer.create({
//         data: {
//           name,
//           email,
//           contact,
//           razorpayId: razorpayCustomer.id,
//         },
//       });
//     } else {
//       // Customer exists → update name/contact only, and set razorpayId if null
//       const updateData = { name, contact };
//       if (!dbCustomer.razorpayId) updateData.razorpayId = razorpayCustomer.id;

//       dbCustomer = await prisma.customer.update({
//         where: { email },
//         data: updateData,
//       });
//     }

//     // 3️⃣ Cancel previous subscriptions for **same customer & same product only**
//     const previousSubs = await prisma.subscription.findMany({
//       where: {
//         customerId: dbCustomer.id,
//         product,
//         status: { not: "cancelled" },
//       },
//     });

//     for (let sub of previousSubs) {
//       try {
//         await razorpay.subscriptions.cancel(sub.razorpaySubscription);

//         await prisma.subscription.update({
//           where: { razorpaySubscription: sub.razorpaySubscription },
//           data: { status: "cancelled", cancelledAt: new Date() },
//         });

//         console.log(`❌ Cancelled previous subscription: ${sub.razorpaySubscription}`);
//       } catch (err) {
//         console.error("❌ Failed to cancel previous subscription:", sub.razorpaySubscription, err);
//       }
//     }

//     // 4️⃣ Create new Razorpay subscription
//     const subscription = await razorpay.subscriptions.create({
//       plan_id,
//       customer_id: razorpayCustomer.id,
//       total_count: 12,
//       customer_notify: 1,
//       notes: { product, frequency, customer_name: name, customer_email: email, customer_contact: contact },
//     });

//     // 5️⃣ Store new subscription in DB
//     await prisma.subscription.create({
//       data: {
//         razorpaySubscription: subscription.id,
//         product,
//         frequency,
//         status: subscription.status,
//         planId: plan_id,
//         customerId: dbCustomer.id,
//       },
//     });

//     res.json({ subscription, customer: dbCustomer });
//   } catch (err) {
//     console.error("❌ Subscription creation failed:", err);
//     res.status(500).json({ error: "Subscription creation failed" });
//   }
// });







// // =====================
// // Razorpay Webhook
// // =====================
// app.post("/razorpay/webhook", (req, res) => {
//   const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

//   try {
//     const shasum = crypto.createHmac("sha256", secret);
//     shasum.update(req.body);
//     const digest = shasum.digest("hex");
//     const razorpaySignature = req.headers["x-razorpay-signature"];

//     if (digest !== razorpaySignature) {
//       console.log("⚠️ Invalid webhook signature");
//       return res.status(400).send("Invalid signature");
//     }

//     const event = JSON.parse(req.body.toString());
//     console.log("📩 Webhook event:", event.event);

//     // Update local DB if subscription payment success
//     if (event.event === "subscription.charged") {
//       const subscriptionId = event.payload.subscription.entity.id;

//       const sub = subscriptionsDB.find(s => s.razorpay_subscription_id === subscriptionId);
//       if (sub) {
//         sub.status = "active";
//         console.log("✅ Subscription activated:", subscriptionId);
//       }
//     }

//     res.status(200).send("Webhook received");
//   } catch (err) {
//     console.error("❌ Webhook error:", err);
//     res.status(500).send("Webhook error");
//   }
// });

// // =====================
// // Start Server
// // =====================
// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => {
//   console.log(`🚀 Server running on http://localhost:${PORT}`);
// });
// server.js
// import express from "express";
// import bodyParser from "body-parser";
// import Razorpay from "razorpay";
// import dotenv from "dotenv";
// import cors from "cors";
// import prisma from "./utils/prisma.js"; // Prisma client
// import session from "express-session";

// dotenv.config();

// const app = express();

// // ===== Middleware =====
// app.use(cors());
// app.use(bodyParser.json());
// app.use(express.urlencoded({ extended: true }));

// app.use(
//   session({
//     secret: process.env.SESSION_SECRET,
//     resave: false,
//     saveUninitialized: false,
//   })
// );

// // ===== Razorpay Client =====
// const razorpay = new Razorpay({
//   key_id: process.env.RAZORPAY_KEY,
//   key_secret: process.env.RAZORPAY_SECRET,
// });

// // ===== Helper: get or create Razorpay customer =====
// async function getOrCreateRazorpayCustomer(name, email, contact) {
//   const existing = await razorpay.customers.all({ email });
//   if (existing.items.length > 0) return existing.items[0];

//   return await razorpay.customers.create({ name, email, contact: contact || null });
// }

// // ===== Check Active Subscription =====
// // ===== Check Active Subscription =====
// app.post("/check-subscription", async (req, res) => {
//   try {
//     const { email, product } = req.body;
//     if (!email || !product) return res.status(400).json({ error: "Missing fields" });

//     const customer = await prisma.customer.findUnique({
//       where: { email },
//       include: {
//         subscriptions: true
//       },
//     });

//     if (!customer) return res.json({ exists: false });

//     // Only active subscriptions (not cancelled)
//     const activeSub = customer.subscriptions.find(
//       (sub) => sub.product === product && sub.status !== "cancelled" && sub.status !== "failed"
//     );

//     if (activeSub) {
//       return res.json({
//         exists: true,
//         subscription_id: activeSub.id, // or razorpayOrderId
//         frequency: activeSub.frequency,
//       });
//     }

//     return res.json({ exists: false });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Check subscription failed" });
//   }
// });


// // ===== Create Subscription (Normal Razorpay Payment) =====
// app.post("/create-subscription", async (req, res) => {
//   try {
//     const {
//       name,
//       email,
//       contact,
//       product,
//       frequency,   // 1,2,3 from frontend
//       quantity,
//       period,
//       deliveryDays,
//       totalAmount,
//       deliveryFee
//     } = req.body;

//     // ===== 1️⃣ Get or create customer =====
//     let dbCustomer = await prisma.customer.findUnique({ where: { email } });
//     const rzCustomer = await getOrCreateRazorpayCustomer(name, email, contact);

//     if (!dbCustomer) {
//       dbCustomer = await prisma.customer.create({
//         data: { name, email, contact: contact || null, razorpayId: rzCustomer.id },
//       });
//     } else if (!dbCustomer.razorpayId) {
//       dbCustomer = await prisma.customer.update({
//         where: { email },
//         data: { razorpayId: rzCustomer.id, name, contact: contact || null },
//       });
//     }

//     // ===== 2️⃣ Cancel previous subscription if exists =====
//     const previousSubs = await prisma.subscription.findMany({
//       where: {
//         customerId: dbCustomer.id,
//         product,
//         status: { not: "cancelled" },
//       },
//     });

//     for (let sub of previousSubs) {
//       await prisma.subscription.update({
//         where: { id: sub.id },
//         data: { status: "cancelled", cancelledAt: new Date() },
//       });
//     }

//     // ===== 3️⃣ Create Razorpay Order =====
//     const order = await razorpay.orders.create({
//       amount: Math.round(totalAmount * 100), // in paise
//       currency: "INR",
//       receipt: `rcpt_${Date.now()}`,
//       notes: {
//         product,
//         frequency: frequency.toString(),
//         quantity: quantity.toString(),
//         period: period.toString(),
//         deliveryDays: deliveryDays?.join(",") || "",
//         totalAmount: totalAmount.toString(),
//         deliveryFee: deliveryFee.toString(),
//       },
//     });

//     // ===== 4️⃣ Store subscription in DB =====
//     const frequencyMap = { 1: "Once / Week", 2: "Twice / Week", 3: "Thrice / Week" };
//     const frequencyString = frequencyMap[frequency] || "Once / Week";

//     const sub = await prisma.subscription.create({
//       data: {
//         razorpayOrderId: order.id,
//         product,
//         frequency: frequencyString,
//         quantity,
//         period,
//         deliveryDays: deliveryDays?.join(",") || null,
//         totalAmount,
//         deliveryFee,
//         status: "pending",
//         customerId: dbCustomer.id,
//         isOneTimePurchase: false,
//       },
//     });

//     res.json({ order, subscription: sub, customer: dbCustomer });
//   } catch (err) {
//     console.error("Subscription creation failed:", err);
//     res.status(500).json({ error: "Subscription creation failed" });
//   }
// });

// // ===== Webhook (Optional) =====
// app.post("/razorpay-webhook", (req, res) => {
//   // Handle payment success/capture here
//   res.status(200).json({ ok: true });
// });

// // ===== Health Check =====
// app.get("/", (req, res) => {
//   res.send("Subscription backend running ✅");
// });

// // ===== Start Server =====
// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => {
//   console.log(`Server running on http://localhost:${PORT}`);
// });


import express from "express";
import bodyParser from "body-parser";
import Razorpay from "razorpay";
import dotenv from "dotenv";
import cors from "cors";
import prisma from "./utils/prisma.js"; // Prisma client
import session from "express-session";

dotenv.config();

const app = express();

// ===== Middleware =====
app.use(cors());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);

// ===== Razorpay Client =====
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY,
  key_secret: process.env.RAZORPAY_SECRET,
});

// ===== Helper: get or create Razorpay customer =====
async function getOrCreateRazorpayCustomer(name, email, contact) {
  const existing = await razorpay.customers.all({ email });
  if (existing.items.length > 0) return existing.items[0];

  return await razorpay.customers.create({ name, email, contact: contact || null });
}

// ===== Check Active Subscription =====
app.post("/check-subscription", async (req, res) => {
  try {
    const { email, product } = req.body;
    if (!email || !product) return res.status(400).json({ error: "Missing fields" });

    const customer = await prisma.customer.findUnique({
      where: { email },
      include: { subscriptions: true },
    });

    if (!customer) return res.json({ exists: false });

    // Only active subscriptions (not cancelled/failed)
    const activeSub = customer.subscriptions.find(
      (sub) => sub.product === product && sub.status !== "cancelled" && sub.status !== "failed"
    );

    if (activeSub) {
      return res.json({
        exists: true,
        subscription_id: activeSub.id,
        frequency: activeSub.frequency,
      });
    }

    return res.json({ exists: false });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Check subscription failed" });
  }
});

// ===== Create Subscription (Normal Razorpay Payment) =====
app.post("/create-subscription", async (req, res) => {
  try {
    const {
      name,
      email,
      contact,
      product,
      frequency,   // 1,2,3 from frontend
      quantity,
      period,
      deliveryDays,
      totalAmount,
      deliveryFee
    } = req.body;

    // ===== 1️⃣ Get or create customer =====
    let dbCustomer = await prisma.customer.findUnique({ where: { email } });
    const rzCustomer = await getOrCreateRazorpayCustomer(name, email, contact);

    if (!dbCustomer) {
      dbCustomer = await prisma.customer.create({
        data: { name, email, contact: contact || null, razorpayId: rzCustomer.id },
      });
    } else if (!dbCustomer.razorpayId) {
      dbCustomer = await prisma.customer.update({
        where: { email },
        data: { razorpayId: rzCustomer.id, name, contact: contact || null },
      });
    }

    // ===== 2️⃣ Cancel previous subscriptions if exists =====
    const previousSubs = await prisma.subscription.findMany({
      where: {
        customerId: dbCustomer.id,
        product,
        status: { not: "cancelled" },
      },
    });

    for (let sub of previousSubs) {
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { status: "cancelled", cancelledAt: new Date() },
      });
    }

    // ===== 3️⃣ Create Razorpay Order =====
    const order = await razorpay.orders.create({
      amount: Math.round(totalAmount * 100), // in paise
      currency: "INR",
      receipt: `rcpt_${Date.now()}`,
      notes: {
        product,
        frequency: frequency.toString(),
        quantity: quantity.toString(),
        period: period.toString(),
        deliveryDays: deliveryDays?.join(",") || "",
        totalAmount: totalAmount.toString(),
        deliveryFee: deliveryFee.toString(),
      },
    });

    // ===== 4️⃣ Map frequency correctly =====
    const freqNum = parseInt(frequency);
    const frequencyMap = { 1: "Once / Week", 2: "Twice / Week", 3: "Thrice / Week" };
    const frequencyString = frequencyMap[freqNum] || "Once / Week";

    // ===== 5️⃣ Store subscription in DB =====
    const sub = await prisma.subscription.create({
      data: {
        razorpayOrderId: order.id,
        product,
        frequency: frequencyString,
        quantity,
        period,
        deliveryDays: deliveryDays?.join(",") || null,
        totalAmount,
        deliveryFee,
        status: "pending",
        customerId: dbCustomer.id,
        isOneTimePurchase: false,
      },
    });

    res.json({ order, subscription: sub, customer: dbCustomer });
  } catch (err) {
    console.error("Subscription creation failed:", err);
    res.status(500).json({ error: "Subscription creation failed" });
  }
});

// ===== Webhook (Optional) =====
app.post("/razorpay-webhook", (req, res) => {
  // Handle payment success/capture here
  res.status(200).json({ ok: true });
});

// ===== Health Check =====
app.get("/", (req, res) => {
  res.send("Subscription backend running ✅");
});

// ===== Start Server =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
