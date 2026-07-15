package com.robi.ran.site;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SiteRepository extends JpaRepository<SiteEntity, String> {
    List<SiteEntity> findAllByDistrictIgnoreCaseOrderBySiteId(String district);
}

