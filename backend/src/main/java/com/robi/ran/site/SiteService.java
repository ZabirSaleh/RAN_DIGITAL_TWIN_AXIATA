package com.robi.ran.site;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Optional;

@Service
public class SiteService {
    private final SiteRepository repository;
    private final CsvSiteParser parser;

    public SiteService(SiteRepository repository, CsvSiteParser parser) {
        this.repository = repository;
        this.parser = parser;
    }

    @Transactional(readOnly = true)
    public List<SiteEntity> findAll(String district) {
        if (district == null || district.isBlank()) return repository.findAll();
        return repository.findAllByDistrictIgnoreCaseOrderBySiteId(DistrictCatalog.canonicalName(district));
    }

    @Transactional(readOnly = true)
    public Optional<SiteEntity> findById(String siteId) {
        return repository.findById(siteId);
    }

    @Transactional
    public SiteEntity importCsv(MultipartFile file) throws IOException {
        if (file.isEmpty()) throw new IllegalArgumentException("CSV file is empty");
        if (file.getSize() > 2_000_000) throw new IllegalArgumentException("CSV file exceeds the 2 MB limit");
        return repository.save(parser.parseFirst(file.getInputStream()));
    }
}

