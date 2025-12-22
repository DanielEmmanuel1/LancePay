interface BalanceCardProps {
  balance: { available: { display: string }; localEquivalent: { display: string; rate: number } } | null
  isLoading: boolean
}

export function BalanceCard({ balance, isLoading }: BalanceCardProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-brand-border p-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-24 mb-4" />
        <div className="h-10 bg-gray-200 rounded w-32 mb-2" />
        <div className="h-4 bg-gray-200 rounded w-40" />
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-brand-border p-6">
      <p className="text-sm text-brand-gray font-medium mb-1">Available Balance</p>
      <h2 className="text-4xl font-bold text-brand-black mb-2">
        {balance?.available.display || '$0.00'}
      </h2>
      <p className="text-sm text-brand-gray">
        ≈ {balance?.localEquivalent.display || '₦0'}
        <span className="text-xs ml-1">@ ₦{balance?.localEquivalent.rate?.toLocaleString() || '0'}/$1</span>
      </p>
    </div>
  )
}
