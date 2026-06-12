ALTER TABLE services DROP COLUMN IF EXISTS image_url;
ALTER TABLE services DROP COLUMN IF EXISTS price;
ALTER TABLE services DROP COLUMN IF EXISTS discount_percentage;
ALTER TABLE services DROP COLUMN IF EXISTS rating;
ALTER TABLE services DROP COLUMN IF EXISTS review_count;

DROP TABLE IF EXISTS uploaded_files;
