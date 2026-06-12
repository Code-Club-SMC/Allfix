-- Add pricing and image fields to services
ALTER TABLE services ADD COLUMN image_url TEXT;
ALTER TABLE services ADD COLUMN price NUMERIC(10,2) DEFAULT 0;
ALTER TABLE services ADD COLUMN discount_percentage INTEGER DEFAULT 0;
ALTER TABLE services ADD COLUMN rating NUMERIC(2,1) DEFAULT 0;
ALTER TABLE services ADD COLUMN review_count INTEGER DEFAULT 0;

-- Create uploaded_files tracking table
CREATE TABLE uploaded_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes BIGINT NOT NULL,
    uploaded_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_uploaded_files_created_at ON uploaded_files(created_at DESC);
