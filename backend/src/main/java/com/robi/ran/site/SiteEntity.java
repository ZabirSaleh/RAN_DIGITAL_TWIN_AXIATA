package com.robi.ran.site;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "ran_sites")
public class SiteEntity {
    @Id
    @Column(name = "site_id", nullable = false, length = 64)
    private String siteId;

    @Column(nullable = false, length = 64)
    private String district;

    @Column(nullable = false, length = 64)
    private String division;

    @Column(nullable = false)
    private double latitude;

    @Column(nullable = false)
    private double longitude;

    @Column(name = "tower_height_m", nullable = false)
    private int towerHeightM;

    @Column(nullable = false, length = 64)
    private String vendor;

    @Column(nullable = false, length = 64)
    private String technology;

    @Column(name = "antenna_count", nullable = false)
    private int antennaCount;

    @Column(name = "rru_count", nullable = false)
    private int rruCount;

    @Column(name = "bbu_count", nullable = false)
    private int bbuCount;

    @Column(name = "power_modules", nullable = false)
    private int powerModules;

    @Column(name = "shelter_status", nullable = false, length = 32)
    private String shelterStatus;

    @Column(name = "site_status", nullable = false, length = 32)
    private String siteStatus;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected SiteEntity() {
    }

    public SiteEntity(
            String siteId,
            String district,
            String division,
            double latitude,
            double longitude,
            int towerHeightM,
            String vendor,
            String technology,
            int antennaCount,
            int rruCount,
            int bbuCount,
            int powerModules,
            String shelterStatus,
            String siteStatus
    ) {
        this.siteId = siteId;
        this.district = district;
        this.division = division;
        this.latitude = latitude;
        this.longitude = longitude;
        this.towerHeightM = towerHeightM;
        this.vendor = vendor;
        this.technology = technology;
        this.antennaCount = antennaCount;
        this.rruCount = rruCount;
        this.bbuCount = bbuCount;
        this.powerModules = powerModules;
        this.shelterStatus = shelterStatus;
        this.siteStatus = siteStatus;
        this.updatedAt = Instant.now();
    }

    public String getSiteId() { return siteId; }
    public String getDistrict() { return district; }
    public String getDivision() { return division; }
    public double getLatitude() { return latitude; }
    public double getLongitude() { return longitude; }
    public int getTowerHeightM() { return towerHeightM; }
    public String getVendor() { return vendor; }
    public String getTechnology() { return technology; }
    public int getAntennaCount() { return antennaCount; }
    public int getRruCount() { return rruCount; }
    public int getBbuCount() { return bbuCount; }
    public int getPowerModules() { return powerModules; }
    public String getShelterStatus() { return shelterStatus; }
    public String getSiteStatus() { return siteStatus; }
    public Instant getUpdatedAt() { return updatedAt; }
}

