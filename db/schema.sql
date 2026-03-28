-- Crypto custody schema (Tatum Virtual Accounts)
-- PostgreSQL 14+

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";

-- ---------------------------------------------------------------------------
-- Users
-- ---------------------------------------------------------------------------
CREATE TABLE users (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email          CITEXT UNIQUE NOT NULL,
  password_hash  TEXT NOT NULL DEFAULT '',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- HD wallets (xpub per chain; maps to Tatum wallet / key material)
-- ---------------------------------------------------------------------------
CREATE TABLE wallets (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  chain                 VARCHAR(16) NOT NULL,
  xpub                  TEXT NOT NULL,
  tatum_signature_id  VARCHAR(64),
  kms_derivation_index  INTEGER NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT wallets_user_chain_unique UNIQUE (user_id, chain),
  CONSTRAINT wallets_chain_check CHECK (chain IN ('ETH', 'MATIC', 'BTC'))
);

CREATE INDEX wallets_user_id_idx ON wallets (user_id);

-- ---------------------------------------------------------------------------
-- Virtual accounts (Tatum VA: balance per user + chain + asset)
-- ---------------------------------------------------------------------------
CREATE TABLE virtual_accounts (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  chain                    VARCHAR(16) NOT NULL,
  balance                  NUMERIC(38, 18) NOT NULL DEFAULT 0,
  currency                 VARCHAR(32) NOT NULL DEFAULT 'native',
  tatum_virtual_account_id VARCHAR(128) UNIQUE,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT virtual_accounts_chain_check CHECK (chain IN ('ETH', 'MATIC', 'BTC')),
  CONSTRAINT virtual_accounts_user_chain_currency_unique UNIQUE (user_id, chain, currency)
);

CREATE INDEX virtual_accounts_user_id_idx ON virtual_accounts (user_id);
CREATE INDEX virtual_accounts_tatum_id_idx ON virtual_accounts (tatum_virtual_account_id)
  WHERE tatum_virtual_account_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Deposit / derived addresses linked to a virtual account
-- ---------------------------------------------------------------------------
CREATE TABLE addresses (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  virtual_account_id  UUID NOT NULL REFERENCES virtual_accounts (id) ON DELETE CASCADE,
  chain               VARCHAR(16) NOT NULL,
  address             TEXT NOT NULL,
  derivation_index    INTEGER,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT addresses_chain_check CHECK (chain IN ('ETH', 'MATIC', 'BTC')),
  CONSTRAINT addresses_chain_address_unique UNIQUE (chain, address)
);

CREATE INDEX addresses_virtual_account_id_idx ON addresses (virtual_account_id);
CREATE INDEX addresses_address_idx ON addresses (address);

-- ---------------------------------------------------------------------------
-- Ledger of on-chain and VA movements
-- ---------------------------------------------------------------------------
CREATE TABLE transactions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  virtual_account_id  UUID NOT NULL REFERENCES virtual_accounts (id) ON DELETE CASCADE,
  tx_hash             VARCHAR(128) NOT NULL,
  chain               VARCHAR(16) NOT NULL,
  type                VARCHAR(24) NOT NULL,
  status              VARCHAR(24) NOT NULL,
  amount              NUMERIC(38, 18) NOT NULL,
  fee                 NUMERIC(38, 18),
  counterparty_address TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT transactions_chain_check CHECK (chain IN ('ETH', 'MATIC', 'BTC')),
  CONSTRAINT transactions_type_check CHECK (
    type IN ('deposit', 'withdrawal', 'internal_transfer', 'fee')
  ),
  CONSTRAINT transactions_status_check CHECK (
    status IN ('pending', 'confirming', 'completed', 'failed', 'cancelled')
  ),
  CONSTRAINT transactions_tx_chain_va_unique UNIQUE (virtual_account_id, tx_hash, chain, type)
);

CREATE INDEX transactions_virtual_account_id_idx ON transactions (virtual_account_id);
CREATE INDEX transactions_tx_hash_chain_idx ON transactions (tx_hash, chain);
CREATE INDEX transactions_status_idx ON transactions (status);
CREATE INDEX transactions_created_at_idx ON transactions (created_at DESC);

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_set_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE TRIGGER wallets_set_updated_at
  BEFORE UPDATE ON wallets
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE TRIGGER virtual_accounts_set_updated_at
  BEFORE UPDATE ON virtual_accounts
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE TRIGGER transactions_set_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
