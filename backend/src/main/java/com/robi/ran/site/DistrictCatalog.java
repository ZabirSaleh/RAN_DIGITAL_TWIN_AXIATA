package com.robi.ran.site;

import java.util.Map;
import java.util.Set;

final class DistrictCatalog {
    private DistrictCatalog() {
    }

    private static final Set<String> DISTRICTS = Set.of(
            "Bagerhat", "Bandarban", "Barguna", "Barisal", "Bhola", "Bogra", "Brahamanbaria", "Chandpur",
            "Chittagong", "Chuadanga", "Comilla", "Cox's Bazar", "Dhaka", "Dinajpur", "Faridpur", "Feni",
            "Gaibandha", "Gazipur", "Gopalganj", "Habiganj", "Jamalpur", "Jessore", "Jhalokati", "Jhenaidah",
            "Joypurhat", "Khagrachhari", "Khulna", "Kishoreganj", "Kurigram", "Kushtia", "Lakshmipur",
            "Lalmonirhat", "Madaripur", "Magura", "Manikganj", "Maulvibazar", "Meherpur", "Munshiganj",
            "Mymensingh", "Naogaon", "Narail", "Narayanganj", "Narsingdi", "Natore", "Nawabganj", "Netrakona",
            "Nilphamari", "Noakhali", "Pabna", "Panchagarh", "Patuakhali", "Pirojpur", "Rajbari", "Rajshahi",
            "Rangamati", "Rangpur", "Satkhira", "Shariatpur", "Sherpur", "Sirajganj", "Sunamganj", "Sylhet",
            "Tangail", "Thakurgaon"
    );

    private static final Map<String, String> ALIASES = Map.of(
            "barishal", "Barisal",
            "bogura", "Bogra",
            "brahmanbaria", "Brahamanbaria",
            "chattogram", "Chittagong",
            "cumilla", "Comilla",
            "jashore", "Jessore",
            "moulvibazar", "Maulvibazar",
            "chapainawabganj", "Nawabganj"
    );

    static String canonicalName(String candidate) {
        if (candidate == null || candidate.isBlank()) {
            throw new IllegalArgumentException("district is required");
        }
        String trimmed = candidate.trim();
        String alias = ALIASES.get(trimmed.toLowerCase());
        if (alias != null) return alias;
        return DISTRICTS.stream()
                .filter(district -> district.equalsIgnoreCase(trimmed))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException(candidate + " is not one of the 64 mapped districts"));
    }
}

