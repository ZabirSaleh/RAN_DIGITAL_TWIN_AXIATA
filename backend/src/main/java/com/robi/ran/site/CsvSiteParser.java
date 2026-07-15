package com.robi.ran.site;

import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Component
public class CsvSiteParser {
    private static final List<String> REQUIRED = List.of(
            "site_id", "district", "division", "latitude", "longitude", "tower_height_m"
    );

    public SiteEntity parseFirst(InputStream inputStream) throws IOException {
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream, StandardCharsets.UTF_8))) {
            String headerLine = nextNonBlank(reader);
            String dataLine = nextNonBlank(reader);
            if (headerLine == null || dataLine == null) {
                throw new IllegalArgumentException("CSV requires a header and at least one site record");
            }

            List<String> headers = parseLine(headerLine).stream()
                    .map(value -> value.trim().toLowerCase(Locale.ROOT).replace(' ', '_').replace('-', '_'))
                    .toList();
            List<String> missing = REQUIRED.stream().filter(header -> !headers.contains(header)).toList();
            if (!missing.isEmpty()) {
                throw new IllegalArgumentException("Missing required columns: " + String.join(", ", missing));
            }

            List<String> values = parseLine(dataLine);
            Map<String, String> record = new HashMap<>();
            for (int index = 0; index < headers.size(); index++) {
                record.put(headers.get(index), index < values.size() ? values.get(index).trim() : "");
            }

            String district = DistrictCatalog.canonicalName(record.get("district"));
            return new SiteEntity(
                    required(record, "site_id"),
                    district,
                    required(record, "division"),
                    number(record, "latitude", -90, 90).doubleValue(),
                    number(record, "longitude", -180, 180).doubleValue(),
                    number(record, "tower_height_m", 5, 150).intValue(),
                    valueOr(record, "vendor", "Multi-vendor"),
                    valueOr(record, "technology", "4G LTE + 5G NR"),
                    numberOr(record, "antenna_count", 6, 1, 36),
                    numberOr(record, "rru_count", 6, 1, 72),
                    numberOr(record, "bbu_count", 2, 1, 24),
                    numberOr(record, "power_modules", 2, 1, 24),
                    valueOr(record, "shelter_status", "Operational"),
                    valueOr(record, "site_status", "Healthy")
            );
        }
    }

    static List<String> parseLine(String line) {
        List<String> values = new ArrayList<>();
        StringBuilder value = new StringBuilder();
        boolean quoted = false;
        for (int index = 0; index < line.length(); index++) {
            char character = line.charAt(index);
            if (character == '"' && index + 1 < line.length() && line.charAt(index + 1) == '"') {
                value.append('"');
                index++;
            } else if (character == '"') {
                quoted = !quoted;
            } else if (character == ',' && !quoted) {
                values.add(value.toString());
                value.setLength(0);
            } else {
                value.append(character);
            }
        }
        values.add(value.toString());
        return values;
    }

    private static String nextNonBlank(BufferedReader reader) throws IOException {
        String line;
        while ((line = reader.readLine()) != null) {
            if (!line.isBlank()) return line;
        }
        return null;
    }

    private static String required(Map<String, String> record, String key) {
        String value = record.get(key);
        if (value == null || value.isBlank()) throw new IllegalArgumentException(key + " is required");
        return value.trim();
    }

    private static Number number(Map<String, String> record, String key, double min, double max) {
        String value = required(record, key);
        try {
            double parsed = Double.parseDouble(value);
            if (parsed < min || parsed > max) throw new IllegalArgumentException(key + " is outside the valid range");
            return parsed;
        } catch (NumberFormatException exception) {
            throw new IllegalArgumentException(key + " must be numeric");
        }
    }

    private static int numberOr(Map<String, String> record, String key, int fallback, int min, int max) {
        String value = record.get(key);
        if (value == null || value.isBlank()) return fallback;
        int parsed;
        try {
            parsed = Integer.parseInt(value);
        } catch (NumberFormatException exception) {
            throw new IllegalArgumentException(key + " must be an integer");
        }
        if (parsed < min || parsed > max) throw new IllegalArgumentException(key + " is outside the valid range");
        return parsed;
    }

    private static String valueOr(Map<String, String> record, String key, String fallback) {
        String value = record.get(key);
        return value == null || value.isBlank() ? fallback : value.trim();
    }
}

