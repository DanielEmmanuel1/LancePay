import { InvoiceForm } from '@/components/invoices/invoice-form'

export default function NewInvoicePage() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-brand-black">Create Invoice</h1>
        <p className="text-brand-gray">Create a new invoice and share the payment link</p>
      </div>
      <div className="bg-white rounded-xl border border-brand-border p-6">
        <InvoiceForm />
      </div>
    </div>
  )
}
