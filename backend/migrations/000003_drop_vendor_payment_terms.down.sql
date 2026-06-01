ALTER TABLE vendors ADD COLUMN payment_terms TEXT NOT NULL DEFAULT 'net_30' CHECK (payment_terms IN ('net_15', 'net_30', 'immediate'));
