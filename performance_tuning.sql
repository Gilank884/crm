-- ══════════════════════════════════════════════════════════════════════════
-- PERFORMANCE TUNING: Maintenance & Asset CRM
-- RUN THIS IN YOUR SUPABASE SQL EDITOR TO ACCELERATE DATA LOADING
-- ══════════════════════════════════════════════════════════════════════════

-- 1. Indexing Maintenance Tasks (Date filtering & SLA calculations)
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_scheduled ON maintenance_tasks (scheduled_date);
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_completed ON maintenance_tasks (completed_date);
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_target ON maintenance_tasks (target_date);
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_kanwil ON maintenance_tasks (kanwil_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_tech ON maintenance_tasks (technician_id);

-- 2. Indexing Managed Assets (TID identification & regional lookup)
CREATE INDEX IF NOT EXISTS idx_managed_assets_tid ON managed_assets (tid);
CREATE INDEX IF NOT EXISTS idx_managed_assets_kanwil ON managed_assets (kanwil_id);

-- 3. Indexing Technicians (Regional lookup)
CREATE INDEX IF NOT EXISTS idx_technicians_kanwil ON technicians (kanwil_id);

-- 4. VACUUM ANALYZE to refresh Postgres statistics
-- This ensures the query planner makes the best use of these new indexes
VACUUM ANALYZE maintenance_tasks;
VACUUM ANALYZE managed_assets;
VACUUM ANALYZE technicians;
