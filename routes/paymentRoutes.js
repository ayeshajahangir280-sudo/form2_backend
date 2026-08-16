const express = require("express");
const { connectDB } = require("../config/db");
const { getStripe } = require("../config/stripe");
const Registration = require("../models/Registration");

const router = express.Router();

router.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  try {
    const signature = req.headers["stripe-signature"];
    if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
      return res.status(400).send("Stripe webhook is not configured");
    }
    const event = getStripe().webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
    const session = event.data.object;

    if (
      (event.type === "checkout.session.completed" ||
        event.type === "checkout.session.async_payment_succeeded") &&
      session.payment_status === "paid"
    ) {
      await connectDB();
      await Registration.findOneAndUpdate(
        { stripeCheckoutSessionId: session.id },
        {
          paymentStatus: "paid",
          paidAt: new Date(),
          stripePaymentIntentId:
            typeof session.payment_intent === "string" ? session.payment_intent : null,
        },
      );
    }

    if (
      event.type === "checkout.session.async_payment_failed" ||
      event.type === "checkout.session.expired"
    ) {
      await connectDB();
      await Registration.findOneAndUpdate(
        { stripeCheckoutSessionId: session.id },
        { paymentStatus: event.type === "checkout.session.expired" ? "expired" : "failed" },
      );
    }
    return res.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook error:", error.message);
    return res.status(400).send(`Webhook error: ${error.message}`);
  }
});

router.get("/session/:sessionId", async (req, res, next) => {
  try {
    await connectDB();
    const registration = await Registration.findOne({
      stripeCheckoutSessionId: req.params.sessionId,
    }).select("firstName lastName paymentStatus paymentAmount paymentCurrency paidAt");
    if (!registration) {
      return res.status(404).json({ ok: false, message: "Payment session not found" });
    }

    if (registration.paymentStatus !== "paid") {
      const session = await getStripe().checkout.sessions.retrieve(req.params.sessionId);
      if (session.payment_status === "paid") {
        registration.paymentStatus = "paid";
        registration.paidAt = new Date();
        registration.stripePaymentIntentId =
          typeof session.payment_intent === "string" ? session.payment_intent : null;
        await registration.save();
      }
    }

    return res.json({
      ok: true,
      payment: {
        status: registration.paymentStatus,
        amount: registration.paymentAmount,
        currency: registration.paymentCurrency,
        paidAt: registration.paidAt,
        name: `${registration.firstName} ${registration.lastName}`,
      },
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
