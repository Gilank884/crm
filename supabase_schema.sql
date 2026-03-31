-- 1. Kanwils (Regional Offices)
CREATE TABLE IF NOT EXISTS kanwils (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    code TEXT UNIQUE, -- e.g., K-01, K-02
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Technicians (Per Kanwil)
CREATE TABLE IF NOT EXISTS technicians (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kanwil_id UUID REFERENCES kanwils(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT,
    specialty TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Managed Assets (Kelolaan Pasti - Per Kanwil)
CREATE TABLE IF NOT EXISTS managed_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kanwil_id UUID REFERENCES kanwils(id) ON DELETE CASCADE,
    pic_id UUID REFERENCES technicians(id) ON DELETE SET NULL, -- PIC / Pelaksana
    tid TEXT UNIQUE, -- Terminal ID or Asset ID
    name TEXT NOT NULL, -- Nama Asset/Site
    location TEXT, -- Lokasi Fisik
    kc_supervisi TEXT, -- Supervising Branch
    dk_lk TEXT, -- Dalam Kota / Luar Kota
    status TEXT DEFAULT 'operational',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Monthly Maintenance (PM/CM Tracking)
CREATE TABLE IF NOT EXISTS maintenance_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID REFERENCES managed_assets(id) ON DELETE CASCADE,
    technician_id UUID REFERENCES technicians(id) ON DELETE SET NULL,
    type TEXT CHECK (type IN ('PM', 'CM')),
    period TEXT NOT NULL, -- e.g. '2026-04'
    scheduled_date DATE,
    completed_date DATE,
    status TEXT DEFAULT 'pending', -- e.g., 'pending', 'in_progress', 'completed'
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed Kanwils
INSERT INTO kanwils (name, code) VALUES 
('Kanwil Jakarta 1', 'K-JKT-1'),
('Kanwil Jakarta 2', 'K-JKT-2'),
('Kanwil Bandung', 'K-BDG'),
('Kanwil Semarang', 'K-SMG'),
('Kanwil Surabaya', 'K-SBY');
