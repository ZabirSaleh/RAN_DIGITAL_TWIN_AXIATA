"use client";

import { ChangeEvent, DragEvent, useMemo, useRef, useState } from "react";
import {
  Activity,
  Antenna,
  ArrowLeft,
  BatteryCharging,
  Box,
  Building2,
  Cable,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Cpu,
  Database,
  Download,
  FileSpreadsheet,
  GitBranch,
  Globe2,
  Layers3,
  LockKeyhole,
  Map,
  MapPin,
  Menu,
  MoreHorizontal,
  Network,
  RadioTower,
  Search,
  Server,
  Settings,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
  Zap,
} from "lucide-react";
import BangladeshMap, { DistrictSelection } from "./components/BangladeshMap";
import DigitalTwinScene, { TwinSite } from "./components/DigitalTwinScene";

const INITIAL_DISTRICT: DistrictSelection = {
  name: "Dhaka",
  division: "Dhaka",
  code: "BD3026",
  lat: 23.8103,
  lng: 90.4125,
};

const vendors = ["Ericsson", "Nokia", "Huawei", "ZTE"];

const seedFor = (value: string) =>
  value.split("").reduce((total, character) => total + character.charCodeAt(0), 0);

const buildDefaultSite = (district: DistrictSelection): TwinSite => {
  const seed = seedFor(district.name);
  const prefix = district.name.replace(/[^a-z]/gi, "").slice(0, 3).toUpperCase().padEnd(3, "X");
  return {
    siteId: `${prefix}-RAN-${String((seed % 89) + 11).padStart(3, "0")}`,
    district: district.name,
    division: district.division,
    lat: district.lat,
    lng: district.lng,
    towerHeight: 30 + (seed % 5) * 5,
    vendor: vendors[seed % vendors.length],
    technology: seed % 3 === 0 ? "4G LTE" : "4G LTE + 5G NR",
    antennaCount: 6,
    rruCount: 6 + (seed % 4),
    bbuCount: 2,
    powerModules: 2,
    shelterStatus: "Operational",
    siteStatus: seed % 13 === 0 ? "Watch" : "Healthy",
  };
};

const parseCsvLine = (line: string) => {
  const values: string[] = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && line[index + 1] === '"') {
      value += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      values.push(value.trim());
      value = "";
    } else {
      value += character;
    }
  }
  values.push(value.trim());
  return values;
};

const toNumber = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const componentCards = (site: TwinSite) => [
  { name: "Tower", detail: `${site.towerHeight}m lattice`, count: "01", icon: RadioTower },
  { name: "Antenna", detail: "Tri-sector panels", count: String(site.antennaCount).padStart(2, "0"), icon: Antenna },
  { name: "Radio unit", detail: `${site.vendor} RRU`, count: String(site.rruCount).padStart(2, "0"), icon: Cable },
  { name: "Shelter", detail: site.shelterStatus, count: "01", icon: Building2 },
  { name: "Baseband", detail: "BBU / gNodeB", count: String(site.bbuCount).padStart(2, "0"), icon: Server },
  { name: "Power", detail: "Rectifier + battery", count: String(site.powerModules).padStart(2, "0"), icon: BatteryCharging },
];

export default function Home() {
  const [selectedDistrict, setSelectedDistrict] = useState<DistrictSelection>(INITIAL_DISTRICT);
  const [districts, setDistricts] = useState<DistrictSelection[]>([]);
  const [siteOverrides, setSiteOverrides] = useState<Record<string, Partial<TwinSite>>>({});
  const [view, setView] = useState<"map" | "twin">("map");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [toast, setToast] = useState("");
  const [activeComponent, setActiveComponent] = useState("Tower");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentSite = useMemo(
    () => ({ ...buildDefaultSite(selectedDistrict), ...siteOverrides[selectedDistrict.name] }),
    [selectedDistrict, siteOverrides],
  );

  const handleDistrictsReady = (loadedDistricts: DistrictSelection[]) => {
    setDistricts(loadedDistricts);
    const dhaka = loadedDistricts.find((district) => district.name === "Dhaka");
    if (dhaka) setSelectedDistrict((current) => current.name === "Dhaka" ? dhaka : current);
  };

  const selectDistrictByName = (name: string) => {
    const district = districts.find((item) => item.name === name);
    if (district) setSelectedDistrict(district);
  };

  const importCsv = async (file: File) => {
    setUploadError("");
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setUploadError("Please choose a CSV file using the supplied site schema.");
      return;
    }

    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
    if (lines.length < 2) {
      setUploadError("The CSV needs a header row and at least one site record.");
      return;
    }

    const headers = parseCsvLine(lines[0]).map((header) =>
      header.trim().toLowerCase().replace(/[\s-]+/g, "_"),
    );
    const requiredHeaders = ["site_id", "district", "latitude", "longitude", "tower_height_m"];
    const missing = requiredHeaders.filter((header) => !headers.includes(header));
    if (missing.length) {
      setUploadError(`Missing required column${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}`);
      return;
    }

    const values = parseCsvLine(lines[1]);
    const record = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
    const matchedDistrict = districts.find(
      (district) => district.name.toLowerCase() === record.district?.toLowerCase(),
    );
    if (!matchedDistrict) {
      setUploadError(`“${record.district || "Unknown"}” is not one of the 64 mapped districts.`);
      return;
    }

    const baseline = buildDefaultSite(matchedDistrict);
    const importedSite: TwinSite = {
      ...baseline,
      siteId: record.site_id || baseline.siteId,
      district: matchedDistrict.name,
      division: record.division || matchedDistrict.division,
      lat: toNumber(record.latitude, matchedDistrict.lat),
      lng: toNumber(record.longitude, matchedDistrict.lng),
      towerHeight: toNumber(record.tower_height_m, baseline.towerHeight),
      vendor: record.vendor || baseline.vendor,
      technology: record.technology || baseline.technology,
      antennaCount: toNumber(record.antenna_count, baseline.antennaCount),
      rruCount: toNumber(record.rru_count, baseline.rruCount),
      bbuCount: toNumber(record.bbu_count, baseline.bbuCount),
      powerModules: toNumber(record.power_modules, baseline.powerModules),
      shelterStatus: record.shelter_status || baseline.shelterStatus,
      siteStatus: record.site_status || baseline.siteStatus,
    };

    setSiteOverrides((current) => ({ ...current, [matchedDistrict.name]: importedSite }));
    setSelectedDistrict(matchedDistrict);
    setUploadOpen(false);
    setView("twin");
    setToast(`${importedSite.siteId} generated from ${file.name}`);
    window.setTimeout(() => setToast(""), 4200);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void importCsv(file);
    event.target.value = "";
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void importCsv(file);
  };

  const downloadTemplate = () => {
    const header = "site_id,district,division,latitude,longitude,tower_height_m,vendor,technology,antenna_count,rru_count,bbu_count,power_modules,shelter_status,site_status";
    const example = `${currentSite.siteId},${selectedDistrict.name},${selectedDistrict.division},${currentSite.lat},${currentSite.lng},${currentSite.towerHeight},${currentSite.vendor},${currentSite.technology},${currentSite.antennaCount},${currentSite.rruCount},${currentSite.bbuCount},${currentSite.powerModules},Operational,Healthy`;
    const blob = new Blob([`${header}\n${example}\n`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "ran-site-import-template.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNavOpen ? "open" : ""}`}>
        <div className="brand-lockup">
          <div className="brand-mark"><RadioTower size={23} /></div>
          <div><strong>Robi<span> RAN</span></strong><small>Digital Twin</small></div>
        </div>

        <nav className="primary-nav" aria-label="Platform modules">
          <span className="nav-label">OPERATIONS</span>
          <button className="nav-item active" type="button" onClick={() => { setView("map"); setMobileNavOpen(false); }}>
            <Map size={18} /><span>Network twin</span><i>01</i>
          </button>
          <button className="nav-item" type="button" onClick={() => setMobileNavOpen(false)}>
            <Activity size={18} /><span>Site health</span><i>64</i>
          </button>
          <button className="nav-item" type="button" onClick={() => setMobileNavOpen(false)}>
            <GitBranch size={18} /><span>Topology</span>
          </button>

          <span className="nav-label">COMING MODULES</span>
          <button className="nav-item muted" type="button" title="Planned for Module 2">
            <FileSpreadsheet size={18} /><span>HLD / LLD</span><LockKeyhole size={13} />
          </button>
          <button className="nav-item muted" type="button" title="Planned for Module 3">
            <Sparkles size={18} /><span>AI operations</span><LockKeyhole size={13} />
          </button>
          <button className="nav-item muted" type="button" title="Planned for Module 3">
            <Database size={18} /><span>KPI analytics</span><LockKeyhole size={13} />
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="poc-status"><span className="pulse-dot" /><div><strong>POC environment</strong><small>Simulated network data</small></div></div>
          <button type="button"><CircleHelp size={17} /> Documentation</button>
          <button type="button"><Settings size={17} /> Settings</button>
        </div>
      </aside>

      <div className="main-shell">
        <header className="topbar">
          <button className="mobile-menu" type="button" onClick={() => setMobileNavOpen((open) => !open)} aria-label="Toggle navigation">
            <Menu size={20} />
          </button>
          <div className="breadcrumb">
            <Globe2 size={16} />
            <span>Bangladesh network</span>
            <ChevronRight size={14} />
            <strong>{view === "map" ? "District overview" : `${selectedDistrict.name} site twin`}</strong>
          </div>
          <div className="topbar-actions">
            <div className="secure-chip"><ShieldCheck size={15} /> RBAC · Viewer</div>
            <button className="icon-button" type="button" aria-label="More options"><MoreHorizontal size={19} /></button>
            <div className="avatar" aria-label="Signed in as Zabir">ZS</div>
          </div>
        </header>

        {view === "map" ? (
          <main className="page-content map-page">
            <section className="page-heading">
              <div>
                <div className="eyebrow"><span /> NATIONAL DIGITAL TWIN · MODULE 01</div>
                <h1>Bangladesh RAN operations</h1>
                <p>Explore all 64 districts, inspect a prototype telecom site and generate site geometry from CSV.</p>
              </div>
              <div className="heading-actions">
                <button className="secondary-button" type="button" onClick={downloadTemplate}><Download size={16} /> CSV template</button>
                <button className="primary-button" type="button" onClick={() => setUploadOpen(true)}><Upload size={16} /> Generate site</button>
              </div>
            </section>

            <section className="stats-row" aria-label="Network overview">
              <article className="stat-card"><div className="stat-icon red"><MapPin size={18} /></div><div><span>Mapped districts</span><strong>64 <small>/ 64</small></strong></div><em>100% ready</em></article>
              <article className="stat-card"><div className="stat-icon navy"><RadioTower size={18} /></div><div><span>Prototype sites</span><strong>64</strong></div><em>1 per district</em></article>
              <article className="stat-card"><div className="stat-icon green"><CheckCircle2 size={18} /></div><div><span>Healthy sites</span><strong>59</strong></div><em>92.2%</em></article>
              <article className="stat-card"><div className="stat-icon amber"><Activity size={18} /></div><div><span>Needs attention</span><strong>05</strong></div><em>Simulated</em></article>
            </section>

            <section className="map-workspace">
              <article className="map-panel">
                <header className="panel-header map-panel-header">
                  <div><span className="panel-kicker">NATIONAL GIS</span><h2>District network map</h2></div>
                  <label className="district-select">
                    <Search size={16} />
                    <select value={selectedDistrict.name} onChange={(event) => selectDistrictByName(event.target.value)} aria-label="Find a district">
                      {districts.length === 0 && <option>Loading districts…</option>}
                      {districts.map((district) => <option key={district.code} value={district.name}>{district.name}</option>)}
                    </select>
                  </label>
                </header>
                <BangladeshMap selectedDistrict={selectedDistrict.name} onSelect={setSelectedDistrict} onReady={handleDistrictsReady} />
              </article>

              <aside className="district-panel">
                <header className="district-panel-hero">
                  <div className="district-code">{selectedDistrict.code.replace("BD", "") || "26"}</div>
                  <div><span>SELECTED DISTRICT</span><h2>{selectedDistrict.name}</h2><p>{selectedDistrict.division} Division · Bangladesh</p></div>
                  <span className={`health-badge ${currentSite.siteStatus.toLowerCase()}`}><i />{currentSite.siteStatus}</span>
                </header>

                <div className="district-meta">
                  <div><span>Prototype sites</span><strong>01</strong></div>
                  <div><span>Coordinates</span><strong>{currentSite.lat.toFixed(3)}, {currentSite.lng.toFixed(3)}</strong></div>
                </div>

                <div className="site-preview-card">
                  <div className="site-preview-top"><div className="tower-thumbnail"><RadioTower size={31} /></div><div><span>SITE ASSET</span><h3>{currentSite.siteId}</h3><p>{currentSite.technology} · {currentSite.vendor}</p></div><button type="button" aria-label="Site options"><MoreHorizontal size={18} /></button></div>
                  <div className="site-specs">
                    <span><RadioTower size={14} /> {currentSite.towerHeight}m tower</span>
                    <span><Antenna size={14} /> {currentSite.antennaCount} antennas</span>
                    <span><Zap size={14} /> {currentSite.powerModules} power units</span>
                  </div>
                  <button className="open-twin-button" type="button" onClick={() => setView("twin")} data-testid="open-twin">
                    Open 3D digital twin <ChevronRight size={17} />
                  </button>
                </div>

                <div className="twin-readiness">
                  <div className="readiness-heading"><span>Digital twin readiness</span><strong>100%</strong></div>
                  <div className="progress-track"><i /></div>
                  <div className="readiness-list">
                    <span><CheckCircle2 size={15} /> Physical assets modelled</span>
                    <span><CheckCircle2 size={15} /> GIS coordinates linked</span>
                    <span><CheckCircle2 size={15} /> CSV schema validated</span>
                  </div>
                </div>
              </aside>
            </section>
          </main>
        ) : (
          <main className="page-content twin-page">
            <section className="twin-heading">
              <div className="twin-title-row">
                <button className="back-button" type="button" onClick={() => setView("map")}><ArrowLeft size={18} /></button>
                <div><div className="eyebrow"><span /> SITE DIGITAL TWIN · {selectedDistrict.name.toUpperCase()}</div><h1>{currentSite.siteId}</h1><p>{currentSite.technology} macro site · {currentSite.vendor} RAN</p></div>
              </div>
              <div className="heading-actions">
                <div className={`large-health ${currentSite.siteStatus.toLowerCase()}`}><span /><div><small>SITE STATUS</small><strong>{currentSite.siteStatus}</strong></div></div>
                <button className="secondary-button" type="button" onClick={() => setUploadOpen(true)}><Upload size={16} /> Update from CSV</button>
              </div>
            </section>

            <section className="twin-overview-grid">
              <article className="scene-panel">
                <header className="panel-header scene-panel-header"><div><span className="panel-kicker">INTERACTIVE GEOMETRY</span><h2>Physical site model</h2></div><div className="simulated-chip"><span className="pulse-dot" /> Simulated</div></header>
                <DigitalTwinScene site={currentSite} activeComponent={activeComponent} onComponentChange={setActiveComponent} />
              </article>

              <aside className="asset-inspector">
                <header><span className="panel-kicker">ASSET INSPECTOR</span><h2>{activeComponent}</h2></header>
                <div className="inspector-visual"><div><Box size={31} /></div><span>IFC-ready object</span></div>
                <dl className="inspector-list">
                  <div><dt>Asset ID</dt><dd>{currentSite.siteId}-{activeComponent.slice(0, 3).toUpperCase()}-01</dd></div>
                  <div><dt>Manufacturer</dt><dd>{currentSite.vendor}</dd></div>
                  <div><dt>Operational state</dt><dd className="state-ok"><span /> In service</dd></div>
                  <div><dt>Last model sync</dt><dd>16 Jul · 03:12 MYT</dd></div>
                </dl>
                <div className="coordinate-card"><MapPin size={17} /><div><span>GEO-REFERENCE</span><strong>{currentSite.lat.toFixed(5)}° N</strong><strong>{currentSite.lng.toFixed(5)}° E</strong></div></div>
                <button className="inspector-action" type="button"><Layers3 size={16} /> View topology relationships</button>
              </aside>
            </section>

            <section className="inventory-section">
              <div className="section-title"><div><span className="panel-kicker">SITE INVENTORY</span><h2>Modelled components</h2></div><span>{componentCards(currentSite).length} asset groups · {componentCards(currentSite).reduce((sum, item) => sum + Number(item.count), 0)} objects</span></div>
              <div className="component-grid">
                {componentCards(currentSite).map((component) => {
                  const Icon = component.icon;
                  const active = activeComponent === component.name;
                  return (
                    <button key={component.name} type="button" className={`component-card ${active ? "active" : ""}`} onClick={() => setActiveComponent(component.name)}>
                      <div className="component-icon"><Icon size={20} /></div><div><span>{component.name}</span><strong>{component.detail}</strong></div><em>{component.count}</em>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="data-lineage">
              <div><Network size={18} /><span>DATA LINEAGE</span></div>
              <p><strong>CSV site schema</strong><ChevronRight size={14} /><strong>Validated asset objects</strong><ChevronRight size={14} /><strong>3D scene graph</strong><ChevronRight size={14} /><strong>District GIS layer</strong></p>
              <span className="verified-chip"><CheckCircle2 size={14} /> Verified</span>
            </section>
          </main>
        )}
      </div>

      {uploadOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setUploadOpen(false)}>
          <section className="upload-modal" role="dialog" aria-modal="true" aria-labelledby="upload-title">
            <header><div className="modal-icon"><FileSpreadsheet size={22} /></div><div><span>GENERATE DIGITAL TWIN</span><h2 id="upload-title">Import site CSV</h2></div><button type="button" onClick={() => setUploadOpen(false)} aria-label="Close CSV import"><X size={19} /></button></header>
            <p className="modal-intro">Upload one site record. The platform validates the district and builds its tower, antenna, radio, baseband, shelter and power objects.</p>
            <div
              className={`drop-zone ${dragActive ? "active" : ""}`}
              onDragEnter={(event) => { event.preventDefault(); setDragActive(true); }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") fileInputRef.current?.click(); }}
            >
              <input ref={fileInputRef} type="file" accept=".csv,text/csv" onChange={handleFileChange} />
              <div className="drop-icon"><Upload size={24} /></div>
              <strong>Drop a site CSV here</strong><span>or click to browse · maximum 2 MB</span>
            </div>
            {uploadError && <div className="upload-error">{uploadError}</div>}
            <div className="schema-preview"><div><span>REQUIRED COLUMNS</span><button type="button" onClick={downloadTemplate}><Download size={14} /> Download template</button></div><code>site_id, district, latitude, longitude, tower_height_m</code><small>Optional component counts and vendor fields are filled with validated defaults.</small></div>
            <footer><ShieldCheck size={15} /><span>Client-side POC import · your CSV is not sent to a live network.</span></footer>
          </section>
        </div>
      )}

      {toast && <div className="toast"><CheckCircle2 size={17} /><span>{toast}</span><button type="button" onClick={() => setToast("")}><X size={15} /></button></div>}
    </div>
  );
}

