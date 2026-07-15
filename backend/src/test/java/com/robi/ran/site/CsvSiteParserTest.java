package com.robi.ran.site;

import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CsvSiteParserTest {
    private final CsvSiteParser parser = new CsvSiteParser();

    @Test
    void parsesACompleteSiteRecord() throws Exception {
        String csv = "site_id,district,division,latitude,longitude,tower_height_m,vendor,technology,antenna_count,rru_count,bbu_count,power_modules,shelter_status,site_status\n"
                + "DHK-RAN-101,Dhaka,Dhaka,23.8103,90.4125,40,Ericsson,4G LTE + 5G NR,6,9,2,2,Operational,Healthy\n";

        SiteEntity site = parser.parseFirst(new ByteArrayInputStream(csv.getBytes(StandardCharsets.UTF_8)));

        assertThat(site.getSiteId()).isEqualTo("DHK-RAN-101");
        assertThat(site.getDistrict()).isEqualTo("Dhaka");
        assertThat(site.getTowerHeightM()).isEqualTo(40);
        assertThat(site.getRruCount()).isEqualTo(9);
    }

    @Test
    void acceptsCurrentDistrictAlias() throws Exception {
        String csv = "site_id,district,division,latitude,longitude,tower_height_m\n"
                + "CTG-RAN-121,Chattogram,Chittagong,22.3569,91.7832,35\n";

        SiteEntity site = parser.parseFirst(new ByteArrayInputStream(csv.getBytes(StandardCharsets.UTF_8)));

        assertThat(site.getDistrict()).isEqualTo("Chittagong");
    }

    @Test
    void rejectsAnUnknownDistrict() {
        String csv = "site_id,district,division,latitude,longitude,tower_height_m\n"
                + "BAD-001,Unknown,Dhaka,23.8,90.4,35\n";

        assertThatThrownBy(() -> parser.parseFirst(new ByteArrayInputStream(csv.getBytes(StandardCharsets.UTF_8))))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("64 mapped districts");
    }
}

