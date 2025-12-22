import { z } from 'zod'

export const createInvoiceSchema = z.object({
  clientEmail: z.string().email(),
  clientName: z.string().optional(),
  description: z.string().min(1).max(500),
  amount: z.number().positive().max(100000),
  dueDate: z.string().optional(),
})

export const addBankAccountSchema = z.object({
  bankCode: z.string().length(3),
  accountNumber: z.string().length(10),
})

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>
export type AddBankAccountInput = z.infer<typeof addBankAccountSchema>
