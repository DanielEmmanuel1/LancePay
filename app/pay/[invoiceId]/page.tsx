'use client'

import { useState, useEffect, use } from 'react'
import { CheckCircle, XCircle, Loader2, CreditCard } from 'lucide-react'

export default function PaymentPage({ params }: { params: Promise<{ invoiceId: string }> }) {
  const { invoiceId } = use(params)
  const [invoice, setInvoice] = useState<any>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'paying' | 'success' | 'error'>('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchInvoice() {
      try {
        const res = await fetch(`/api/pay/${invoiceId}`)
        if (!res.ok) throw new Error('Invoice not found')
        const data = await res.json()
        setInvoice(data)
        setStatus(data.status === 'paid' ? 'success' : 'ready')
      } catch {
        setStatus('error')
        setError('Invoice not found or expired')
      }
    }
    fetchInvoice()
  }, [invoiceId])

  const handlePay = async () => {
    setStatus('paying')
    try {
      const res = await fetch(`/api/pay/${invoiceId}`, { method: 'POST' })
      if (!res.ok) throw new Error('Payment failed')
      setStatus('success')
    } catch {
      setStatus('error')
      setError('Payment failed. Please try again.')
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Error</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
          <p className="text-gray-600 mb-4">Thank you for your payment of ${invoice?.amount?.toFixed(2)}</p>
          <p className="text-sm text-gray-500">Invoice #{invoiceId}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-xl">LP</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Payment Request</h1>
          <p className="text-gray-600">from {invoice?.freelancerName}</p>
        </div>

        <div className="border-t border-b border-gray-200 py-4 mb-6">
          <p className="text-gray-600 mb-2">{invoice?.description}</p>
          <div className="flex justify-between items-center">
            <span className="text-gray-500">Amount</span>
            <span className="text-3xl font-bold text-gray-900">${invoice?.amount?.toFixed(2)}</span>
          </div>
          {invoice?.dueDate && (
            <p className="text-sm text-gray-500 mt-2">Due: {new Date(invoice.dueDate).toLocaleDateString()}</p>
          )}
        </div>

        <p className="text-xs text-gray-500 text-center mb-4">Invoice #{invoiceId}</p>

        <button
          onClick={handlePay}
          disabled={status === 'paying'}
          className="w-full py-4 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {status === 'paying' ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CreditCard className="w-5 h-5" />
              Pay ${invoice?.amount?.toFixed(2)}
            </>
          )}
        </button>

        <p className="text-xs text-gray-400 text-center mt-4">
          Powered by LancePay • Secure payment
        </p>
      </div>
    </div>
  )
}
