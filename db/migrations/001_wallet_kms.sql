-- Optional: KMS signing metadata for off-chain withdrawals (Tatum KMS signatureId + EVM derivation index)
ALTER TABLE wallets
  ADD COLUMN IF NOT EXISTS tatum_signature_id VARCHAR(64),
  ADD COLUMN IF NOT EXISTS kms_derivation_index INTEGER NOT NULL DEFAULT 0;
