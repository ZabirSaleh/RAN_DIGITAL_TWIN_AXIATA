CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE ran_sites (
    site_id VARCHAR(64) PRIMARY KEY,
    district VARCHAR(64) NOT NULL,
    division VARCHAR(64) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90 AND 90),
    longitude DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
    geom geometry(Point, 4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)) STORED,
    tower_height_m INTEGER NOT NULL CHECK (tower_height_m BETWEEN 5 AND 150),
    vendor VARCHAR(64) NOT NULL,
    technology VARCHAR(64) NOT NULL,
    antenna_count INTEGER NOT NULL,
    rru_count INTEGER NOT NULL,
    bbu_count INTEGER NOT NULL,
    power_modules INTEGER NOT NULL,
    shelter_status VARCHAR(32) NOT NULL,
    site_status VARCHAR(32) NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX ran_sites_district_idx ON ran_sites (LOWER(district));
CREATE INDEX ran_sites_geom_idx ON ran_sites USING GIST (geom);

