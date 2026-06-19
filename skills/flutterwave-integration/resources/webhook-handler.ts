import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { writeAuditLog } from '@/modules/audit/audit.service'
import { Decimal } from '@prisma/client/runtime/library'

const FLW_WEBHOOK_SECRET = process.env.FLW_WEBHOOK_SECRET!
const FLW_SECRET_KEY = process.env.FLW_SECRET_KEY!

async function verifyFlutterwaveTransaction(transactionId: number) {
  const res = await fetch(
    `https://api.flutterwave.com/v3/transactions/${transactionId}/verify`,
    { headers: { Authorization: `Bearer ${FLW_SECRET_KEY}` } }
  )
  const body = await res.json()
  if (!body.status || body.status !== 'success') return null

  const data = body.data
  if (
    data.status !== 'successful' ||
    data.currency !== 'NGN'
  ) return null

  return {
    transactionId: data.id,
    txRef: data.tx_ref,
    amount: new Decimal(data.amount),
    currency: data.currency,
    meta: data.meta || {},
    customer: data.customer,
  }
}

export async function POST(req: NextRequest) {
  // 1. Verify webhook signature
  const hash = req.headers.get('verif-hash')
  if (hash !== FLW_WEBHOOK_SECRET) {
    return Response.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const payload = await req.json()

  // 2. Only handle successful charge completions
  if (payload.event !== 'charge.completed') {
    return Response.json({ received: true })
  }
  if (payload.data.status !== 'successful') {
    return Response.json({ received: true })
  }

  const txRef: string = payload.data.tx_ref

  // 3. Idempotency check — has this tx_ref been processed?
  const existing = await prisma.payment.findFirst({
    where: { transactionReference: txRef },
    select: { id: true },
  })
  if (existing) {
    return Response.json({ received: true, duplicate: true })
  }

  // 4. Re-verify via Flutterwave Verify API — never trust webhook payload alone
  const verified = await verifyFlutterwaveTransaction(payload.data.id)
  if (!verified) {
    return Response.json({ error: 'Verification failed' }, { status: 400 })
  }

  // 5. Extract metadata to identify the invoice
  const invoiceId: string | undefined = verified.meta.invoiceId
  const schoolId: string | undefined = verified.meta.schoolId
  const parentId: string | undefined = verified.meta.parentId
  const parentEmail: string = verified.customer?.email || ''

  if (!invoiceId || !schoolId) {
    return Response.json({ error: 'Missing metadata' }, { status: 400 })
  }

  // 6. Validate the meta matches the transaction
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId, schoolId },
    select: { id: true, finalAmount: true, balanceDue: true, status: true, studentId: true },
  })
  if (!invoice) {
    return Response.json({ error: 'Invoice not found' }, { status: 404 })
  }

  if (verified.amount.gt(invoice.balanceDue)) {
    return Response.json({ error: 'Amount exceeds balance due' }, { status: 400 })
  }

  // 7. Record payment + update invoice + audit log in one transaction
  const payment = await prisma.$transaction(async (tx) => {
    const created = await tx.payment.create({
      data: {
        schoolId,
        invoiceId,
        parentId: parentId || '',
        studentId: invoice.studentId,
        amountPaid: verified.amount,
        paymentMethod: 'online_gateway',
        transactionReference: txRef,
        flutterwaveTransactionId: String(verified.transactionId),
        verificationStatus: 'approved',
        verifiedAt: new Date(),
        paymentDate: new Date(),
      },
    })

    const payments = await tx.payment.findMany({
      where: { invoiceId, schoolId, verificationStatus: 'approved' },
      select: { amountPaid: true },
    })
    const totalPaid = payments.reduce((sum, p) => sum.plus(p.amountPaid), new Decimal(0))
    const balanceDue = invoice.finalAmount.minus(totalPaid)
    const status = balanceDue.lte(0) ? 'paid' : totalPaid.gt(0) ? 'partial' : 'issued'

    await tx.invoice.update({
      where: { id: invoiceId },
      data: { amountPaid: totalPaid, balanceDue, status },
    })

    await writeAuditLog(tx, {
      schoolId,
      actorId: 'system',
      actorName: 'Flutterwave Webhook',
      action: 'approve',
      entityType: 'Payment',
      entityId: created.id,
      previousValue: null,
      newValue: created,
    })

    return created
  })

  // 8. Outside transaction — enqueue side effects
  // Receipt generation and email notification are queued asynchronously
  // via BullMQ to avoid blocking the webhook response
  await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/jobs/enqueue-receipt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentId: payment.id }),
  }).catch(() => {
    console.error('Failed to enqueue receipt generation for payment', payment.id)
  })

  return Response.json({ received: true })
}
