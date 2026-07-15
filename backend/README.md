# Robi RAN Digital Twin API

Spring Boot 4.1 / Java 21 service for Module 1. It validates one site record from CSV and persists the generated site object to PostgreSQL/PostGIS.

## Endpoints

- `GET /api/v1/sites`
- `GET /api/v1/sites?district=Dhaka`
- `GET /api/v1/sites/{siteId}`
- `POST /api/v1/sites/import` using multipart field `file`

## CSV contract

Required columns: `site_id,district,division,latitude,longitude,tower_height_m`.

Optional columns: `vendor,technology,antenna_count,rru_count,bbu_count,power_modules,shelter_status,site_status`.

Current district spellings such as Chattogram, Cumilla, Bogura and Jashore are accepted and normalized to the BBS GIS layer names.

