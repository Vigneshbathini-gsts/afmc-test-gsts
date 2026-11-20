CREATE TABLE IF NOT EXISTS api_rate_limit_buckets (
  bucket_key CHAR(64) NOT NULL,
  window_started_at BIGINT UNSIGNED NOT NULL,
  request_count INT UNSIGNED NOT NULL,
  PRIMARY KEY (bucket_key),
  KEY idx_api_rate_limit_window (window_started_at)
);

UPDATE xxafmc_users
SET REQUIRED_PASSWORD_CHANGE = 'Y'
WHERE PASSWORD IS NULL
   OR PASSWORD NOT LIKE '$2%';
