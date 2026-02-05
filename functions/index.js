const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

/* ===============================
   CREATE CHECKOUT SESSION
================================= */
exports.createCheckoutSession = onCall(async (request) => {

  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Login required.");
  }

  const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

  const uid = request.auth.uid;
  const userRef = db.collection("users").doc(uid);
  const userSnap = await userRef.get();
  const email = userSnap.data().email;

  let customerId = userSnap.data().stripeCustomerId;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email,
      metadata: { uid }
    });

    customerId = customer.id;

    await userRef.set({ stripeCustomerId: customerId }, { merge: true });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [
      {
        price: process.env.STRIPE_PRICE_ID,
        quantity: 1
      }
    ],
    success_url: `${request.data.origin}/success.html`,
    cancel_url: `${request.data.origin}/cancel.html`
  });

  return { url: session.url };
});

/* ===============================
   STRIPE WEBHOOK
================================= */
exports.stripeWebhook = onRequest(
  { invoker: "public" },
  async (req, res) => {

    const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

    const sig = req.headers["stripe-signature"];
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.rawBody,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const customerId = session.customer;

      const q = await db.collection("users")
        .where("stripeCustomerId", "==", customerId)
        .limit(1)
        .get();

      if (!q.empty) {
        await q.docs[0].ref.set({ isPremium: true }, { merge: true });
      }
    }

    res.json({ received: true });
  }
);


/* ===============================
   SEED MODULES
================================= */
exports.seedModules = onRequest(
  { invoker: "public" },
  async (req, res) => {

    const modules = [
      { id: "greetings", title: "Greetings", order: 1, isPremium: false },
      { id: "animals", title: "Animals (Oduma)", order: 2, isPremium: false },
      { id: "numbers", title: "Numbers", order: 3, isPremium: true }
    ];

    for (const mod of modules) {
      await db.collection("modules").doc(mod.id).set(mod);
    }

    res.send("Seeding complete");
  }
);
