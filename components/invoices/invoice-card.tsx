import Link from 'next/link'
import { FileText, Copy, ExternalLink } from 'lucide-react'

interface Invoice {
  id: string
  invoiceNumber: string
  clientEmail: string
  description: string
  amount: number
  status: string
  paymentLink: string
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-800',
}

export function InvoiceCard({ invoice }: { invoice: Invoice }) {
  const copyLink = () => {
    navigator.clipboard.writeText(invoice.paymentLink)
  }

  return (
    <div className="bg-white rounded-xl border border-brand-border p-4 hover:border-brand-black/30 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-light rounded-lg flex items-center justify-center">
            <FileText className="w-5 h-5 text-brand-gray" />
          </div>
          <div>
            <p className="font-medium text-brand-black">{invoice.invoiceNumber}</p>
            <p className="text-sm text-brand-gray">{invoice.clientEmail}</p>
          </div>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[invoice.status] || 'bg-gray-100'}`}>
          {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
        </span>
      </div>
      
      <p className="text-sm text-brand-gray mb-3 line-clamp-2">{invoice.description}</p>
      
      <div className="flex items-center justify-between">
        <p className="text-xl font-bold text-brand-black">${Number(invoice.amount).toFixed(2)}</p>
        <div className="flex items-center gap-2">
          <button onClick={copyLink} className="p-2 text-brand-gray hover:text-brand-black hover:bg-brand-light rounded-lg transition-colors" title="Copy payment link">
            <Copy className="w-4 h-4" />
          </button>
          <Link href={`/dashboard/invoices/${invoice.id}`} className="p-2 text-brand-gray hover:text-brand-black hover:bg-brand-light rounded-lg transition-colors" title="View details">
            <ExternalLink className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
