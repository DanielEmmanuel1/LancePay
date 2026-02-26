-- Migration: add_collaborator_payment_source
-- Adds paymentSource field to InvoiceCollaborator to track whether a payout
-- originated from a direct payment, escrow release, or payment advance.

ALTER TABLE "InvoiceCollaborator" ADD COLUMN "paymentSource" TEXT;
