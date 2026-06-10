// mollie-webhook — Mollie payment status callbacks.
//
// Deployed with verify_jwt=false. Mollie POSTs `id=tr_xxx` (form-encoded);
// the payload carries no trust — we fetch the payment from the Mollie API
// with our key, which is the authentication.
//
// First payment paid  → create the recurring €19/month subscription,
//                       mark ours active.
// Recurring paid      → extend current_period_end.
// Failed/expired      → past_due (recurring) or canceled (first).

const PRICE_EUR = '19.00'

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
  const text = await req.text()
  const paymentId = new URLSearchParams(text).get('id')
  if (!paymentId) return new Response('ok', { status: 200 })

  const mollieKey = await ctx.vault.get('MOLLIE_API_KEY')
  if (!mollieKey) return new Response('not configured', { status: 503 })

  const payment = await mollie(mollieKey, 'GET', `/payments/${paymentId}`)
  const userId = payment.metadata?.userId
  if (!userId) return new Response('ok', { status: 200 })

  const rows = await ctx.db.sql('SELECT * FROM subscriptions WHERE user_id = $1', [userId])
  const sub = rows[0]
  if (!sub) return new Response('ok', { status: 200 })

  if (payment.status === 'paid' && payment.sequenceType === 'first') {
    // Mandate established — start the recurring subscription.
    const gatewayUrl = (await ctx.vault.get('GATEWAY_URL')) || 'https://predwell.eurobase.app'
    const publicKey = await ctx.vault.get('PUBLIC_API_KEY')
    const subscription = await mollie(
      mollieKey,
      'POST',
      `/customers/${payment.customerId}/subscriptions`,
      {
        amount: { currency: 'EUR', value: PRICE_EUR },
        interval: '1 month',
        description: 'Predwell Pro',
        startDate: new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 10),
        ...(publicKey
          ? { webhookUrl: `${gatewayUrl}/v1/functions/mollie-webhook?apikey=${publicKey}` }
          : {}),
        metadata: { userId },
      },
    )
    await ctx.db.sql(
      `UPDATE subscriptions
       SET status = 'active', mollie_subscription_id = $2,
           current_period_end = now() + interval '1 month', updated_at = now()
       WHERE id = $1`,
      [sub.id, subscription.id],
    )
    ctx.log.info('subscription activated', { userId })
  } else if (payment.status === 'paid') {
    await ctx.db.sql(
      `UPDATE subscriptions
       SET status = 'active', current_period_end = now() + interval '1 month', updated_at = now()
       WHERE id = $1`,
      [sub.id],
    )
    ctx.log.info('subscription renewed', { userId })
  } else if (['failed', 'expired', 'canceled'].includes(payment.status)) {
    const next = payment.sequenceType === 'first' ? 'canceled' : 'past_due'
    await ctx.db.sql(`UPDATE subscriptions SET status = $2, updated_at = now() WHERE id = $1`, [
      sub.id,
      next,
    ])
    ctx.log.warn('payment not completed', { userId, status: payment.status })
  }

  return new Response('ok', { status: 200 })
}
