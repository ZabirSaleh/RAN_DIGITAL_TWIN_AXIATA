"use client";

import { useEffect, useRef } from "react";
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";
import type { GeoJSON as LeafletGeoJSON, Map as LeafletMap, PathOptions } from "leaflet";

export type DistrictSelection = {
  name: string;
  division: string;
  code: string;
  lat: number;
  lng: number;
};

type DistrictProperties = {
  adm2_en: string;
  adm2_pcode: string;
  adm1_en: string;
  adm1_pcode: string;
};

type BangladeshMapProps = {
  selectedDistrict: string;
  onSelect: (district: DistrictSelection) => void;
  onReady: (districts: DistrictSelection[]) => void;
};

const districtSeed = (name: string) =>
  name.split("").reduce((total, character) => total + character.charCodeAt(0), 0);

const healthColor = (name: string) => {
  const score = districtSeed(name) % 13;
  if (score === 0) return "#ef8f2f";
  if (score === 1) return "#f2c14e";
  return "#4db58a";
};

export default function BangladeshMap({
  selectedDistrict,
  onSelect,
  onReady,
}: BangladeshMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const geoJsonRef = useRef<LeafletGeoJSON | null>(null);
  const onSelectRef = useRef(onSelect);
  const onReadyRef = useRef(onReady);
  const selectedRef = useRef(selectedDistrict);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    selectedRef.current = selectedDistrict;
    const group = geoJsonRef.current;
    if (!group) return;

    group.eachLayer((layer) => {
      const feature = (layer as unknown as { feature?: Feature<Polygon | MultiPolygon, DistrictProperties> })
        .feature;
      const name = feature?.properties?.adm2_en;
      if (!name || !("setStyle" in layer)) return;
      (layer as unknown as { setStyle: (style: PathOptions) => void }).setStyle({
        fillColor: name === selectedDistrict ? "#e40046" : healthColor(name),
        fillOpacity: name === selectedDistrict ? 0.94 : 0.78,
        color: name === selectedDistrict ? "#ffffff" : "#d7e2ea",
        weight: name === selectedDistrict ? 2.2 : 0.85,
      });
    });
  }, [selectedDistrict]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let isMounted = true;

    const initializeMap = async () => {
      const L = await import("leaflet");
      if (!isMounted || !containerRef.current) return;

      const map = L.map(containerRef.current, {
        center: [23.75, 90.35],
        zoom: 6.35,
        minZoom: 5.8,
        maxZoom: 10,
        zoomControl: false,
        attributionControl: true,
        scrollWheelZoom: true,
      });
      map.attributionControl.setPrefix(false);
      L.control.zoom({ position: "bottomright" }).addTo(map);
      mapRef.current = map;

      const response = await fetch("/bangladesh-districts.geojson");
      const collection = (await response.json()) as FeatureCollection<
        Polygon | MultiPolygon,
        DistrictProperties
      >;

      const districts: DistrictSelection[] = [];
      const markers = L.layerGroup().addTo(map);

      const group = L.geoJSON(collection, {
        style: (feature) => {
          const name = feature?.properties.adm2_en ?? "";
          const isSelected = name === selectedRef.current;
          return {
            fillColor: isSelected ? "#e40046" : healthColor(name),
            fillOpacity: isSelected ? 0.94 : 0.78,
            color: isSelected ? "#ffffff" : "#d7e2ea",
            weight: isSelected ? 2.2 : 0.85,
          };
        },
        onEachFeature: (feature, layer) => {
          const bounds = (layer as L.Polygon).getBounds();
          const center = bounds.getCenter();
          const district: DistrictSelection = {
            name: feature.properties.adm2_en,
            division: feature.properties.adm1_en,
            code: feature.properties.adm2_pcode,
            lat: Number(center.lat.toFixed(5)),
            lng: Number(center.lng.toFixed(5)),
          };
          districts.push(district);

          layer.bindTooltip(
            `<div class="district-tooltip"><strong>${district.name}</strong><span>${district.division} Division · 1 prototype site</span></div>`,
            { sticky: true, direction: "top", offset: [0, -8] },
          );

          layer.on({
            click: () => {
              onSelectRef.current(district);
              const polygonBounds = (layer as L.Polygon).getBounds();
              map.flyToBounds(polygonBounds, { padding: [54, 54], maxZoom: 8.15, duration: 0.7 });
            },
            mouseover: () => {
              (layer as L.Path).setStyle({ fillOpacity: 0.98, color: "#ffffff", weight: 2 });
              (layer as L.Path).bringToFront();
            },
            mouseout: () => {
              const isSelected = feature.properties.adm2_en === selectedRef.current;
              (layer as L.Path).setStyle({
                fillColor: isSelected ? "#e40046" : healthColor(feature.properties.adm2_en),
                fillOpacity: isSelected ? 0.94 : 0.78,
                color: isSelected ? "#ffffff" : "#d7e2ea",
                weight: isSelected ? 2.2 : 0.85,
              });
            },
          });

          L.circleMarker(center, {
            radius: 2.5,
            fillColor: "#ffffff",
            fillOpacity: 0.96,
            color: "#17304c",
            weight: 1.2,
            interactive: false,
          }).addTo(markers);
        },
      }).addTo(map);

      geoJsonRef.current = group;
      map.fitBounds(group.getBounds(), { padding: [28, 28] });
      onReadyRef.current(districts.sort((a, b) => a.name.localeCompare(b.name)));
    };

    void initializeMap();

    return () => {
      isMounted = false;
      mapRef.current?.remove();
      mapRef.current = null;
      geoJsonRef.current = null;
    };
  }, []);

  return (
    <div className="map-stage" aria-label="Interactive map of 64 Bangladesh districts">
      <div ref={containerRef} className="leaflet-map" data-testid="bangladesh-map" />
      <div className="map-legend" aria-label="Map health legend">
        <span><i className="legend-dot healthy" />Healthy</span>
        <span><i className="legend-dot watch" />Watch</span>
        <span><i className="legend-dot selected" />Selected</span>
      </div>
      <div className="map-data-chip">
        <span className="pulse-dot" />
        GIS layer · BBS 2020
      </div>
    </div>
  );
}

