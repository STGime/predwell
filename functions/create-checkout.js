// create-checkout — starts a Predwell Pro (€19/month) Mollie checkout.
//
// Deployed with verify_jwt=true: ctx.user is the authenticated end-user.
// Creates (or reuses) a Mollie customer, then a first payment with
// sequenceType "first" to establish a SEPA/card mandate. The recurring
// subscription itself is created by mollie-webhook once this payment is
// paid (standard Mollie recurring flow).
//
// Vault secrets:
//   MOLLIE_API_KEY  — test_... or live_... key (required)
//   APP_URL         — frontend origin for the redirect (default localhost:3000)
//   GATEWAY_URL     — this project's API origin for the webhook URL
//   PUBLIC_API_KEY  — eb_pk_... used on the webhook URL's apikey query param

const PRICE_EUR = '19.00'

function jsonResponse(body, status) {
  return new Response(JSON.stringify(body), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

async function mollie(key, method, path, body) {
  const res = await fetch(`https://api.mollie.com/v2${path}`, {
    method,
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(`Mollie ${method} ${path} failed (${res.status}): ${data.detail || data.title}`)
  }
  return data
}

globalThis.handler = async (req, ctx) => {
  if (!ctx.user) return jsonResponse({ error: 'authentication required' }, 401)

  const mollieKey = await ctx.vault.get('MOLLIE_API_KEY')
  if (!mollieKey) {
    return jsonResponse({ error: 'payments not configured yet — set MOLLIE_API_KEY in Vault' }, 503)
  }
  const appUrl = (await ctx.vault.get('APP_URL')) || 'http://localhost:3000'
  const gatewayUrl = (await ctx.vault.get('GATEWAY_URL')) || 'https://predwell.eurobase.app'
  const publicKey = await ctx.vault.get('PUBLIC_API_KEY')

  const existingRows = await ctx.db.sql('SELECT * FROM subscriptions WHERE user_id = $1', [
    ctx.user.id,
  ])
  const existing = existingRows[0]
  if (existing && existing.status === 'active') {
    return jsonResponse({ error: 'already subscribed' }, 409)
  }

  let customerId = existing?.mollie_customer_id
  if (!customerId) {
    const customer = await mollie(mollieKey, 'POST', '/customers', {
      email: ctx.user.email,
      metadata: { userId: ctx.user.id },
    })
    customerId = customer.id
  }

  const payment = await mollie(mollieKey, 'POST', '/payments', {
    amount: { currency: 'EUR', value: PRICE_EUR },
    description: 'Predwell Pro — first month',
    customerId,
    sequenceType: 'first',
    redirectUrl: `${appUrl}/app/settings?checkout=return`,
    ...(publicKey
      ? { webhookUrl: `${gatewayUrl}/v1/functions/mollie-webhook?apikey=${publicKey}` }
      : {}),
    metadata: { userId: ctx.user.id },
  })

  if (existing) {
    await ctx.db.sql(
      `UPDATE subscriptions SET mollie_customer_id = $2, status = 'pending', updated_at = now()
       WHERE id = $1`,
      [existing.id, customerId],
    )
  } else {
    await ctx.db.sql(
      `INSERT INTO subscriptions (user_id, mollie_customer_id, status) VALUES ($1, $2, 'pending')`,
      [ctx.user.id, customerId],
    )
  }

  ctx.log.info('checkout created', { userId: ctx.user.id, paymentId: payment.id })
  return { checkoutUrl: payment._links.checkout.href }
}
