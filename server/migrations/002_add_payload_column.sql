-- Migration: 002_add_payload_column.sql
-- Thêm cột payload kiểu String để chứa JSON metadata (product_id, amount, status, ...) mà không phá vỡ dữ liệu lịch sử
ALTER TABLE analytics_events_v0 
ADD COLUMN IF NOT EXISTS payload String DEFAULT '{}';
