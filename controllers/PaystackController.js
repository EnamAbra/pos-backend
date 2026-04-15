import https from 'https';
import crypto from 'crypto';
import queryAsync from '../queryAsync.js';

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY?.trim();

// ─────────────────────────────────────────────
// Helper: Paystack Request
// ─────────────────────────────────────────────
function paystackRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.paystack.co',
      port: 443,
      path,
      method,
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', chunk => data += chunk);

      res.on('end', () => {
        console.log("📡 Paystack raw:", data);

        try {
          resolve(JSON.parse(data));
        } catch {
          reject(new Error('Invalid JSON from Paystack'));
        }
      });
    });

    req.on('error', (err) => {
      console.error("❌ Network error:", err);
      reject(err);
    });

    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// ─────────────────────────────────────────────
// INITIATE PAYMENT
// ─────────────────────────────────────────────
export const initiateMomoPayment = async (req, res) => {
  try {
    const { phone, network, cart_items, customer_id } = req.body;
    const cashier_id = req.user.user_id;

    if (!phone || !network || !cart_items?.length) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Normalize phone
    let momoPhone = phone.replace(/\s+/g, '');
    if (momoPhone.startsWith('0')) {
      momoPhone = '+233' + momoPhone.substring(1);
    }

    // Calculate total
    let total = 0;
    const enrichedItems = [];

    for (const item of cart_items) {
      const rows = await queryAsync(
        'SELECT product_id, product_name, price FROM products WHERE product_id = ?',
        [item.product_id]
      );

      if (!rows.length) {
        return res.status(404).json({ message: 'Product not found' });
      }

      const product = rows[0];
      const subtotal = product.price * item.quantity;

      total += subtotal;

      enrichedItems.push({
        ...product,
        quantity: item.quantity,
        subtotal,
      });
    }

    const reference = `POS-${Date.now()}`;

    // Save transaction
    await queryAsync(
      `INSERT INTO paystack_transactions
      (reference, cashier_id, customer_id, amount, status, cart_snapshot)
      VALUES (?, ?, ?, ?, 'pending', ?)`,
      [
        reference,
        cashier_id,
        customer_id || null,
        total,
        JSON.stringify(enrichedItems),
      ]
    );

    // ✅ Correct Paystack call
    const paystackRes = await paystackRequest(
      'POST',
      '/transaction/initialize',
      {
        amount: Math.round(total * 100),
        email: `pos-${cashier_id}@example.com`,
        currency: 'GHS',
        reference,
        channels: ['mobile_money'],
        metadata: {
          phone: momoPhone,
          custom_fields: [
            {
              display_name: "Phone",
              variable_name: "phone",
              value: momoPhone,
            },
          ],
        },
      }
    );

    if (!paystackRes.status) {
      return res.status(500).json({ message: 'Paystack error' });
    }

    return res.json({
      success: true,
      authorization_url: paystackRes.data.authorization_url,
      reference: paystackRes.data.reference,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Payment initiation failed' });
  }
};

// ─────────────────────────────────────────────
// VERIFY PAYMENT
// ─────────────────────────────────────────────
export const verifyMomoPayment = async (req, res) => {
  const { reference } = req.params;

  try {
    const paystackRes = await paystackRequest(
      'GET',
      `/transaction/verify/${reference}`
    );

    const status = paystackRes.data.status;

    if (status === 'success') {
      await queryAsync(
        `UPDATE paystack_transactions SET status='success' WHERE reference=?`,
        [reference]
      );

      return res.json({ success: true });
    }

    return res.json({ success: false, status });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Verification failed' });
  }
};

// ─────────────────────────────────────────────
// WEBHOOK (OPTIONAL BUT GOOD)
// ─────────────────────────────────────────────
export const paystackWebhook = async (req, res) => {
  const hash = crypto
    .createHmac('sha512', PAYSTACK_SECRET)
    .update(req.rawBody)
    .digest('hex');

  if (hash !== req.headers['x-paystack-signature']) {
    return res.sendStatus(401);
  }

  const event = req.body;

  if (event.event === 'charge.success') {
    const reference = event.data.reference;

    await queryAsync(
      `UPDATE paystack_transactions SET status='success' WHERE reference=?`,
      [reference]
    );
  }

  res.sendStatus(200);
};