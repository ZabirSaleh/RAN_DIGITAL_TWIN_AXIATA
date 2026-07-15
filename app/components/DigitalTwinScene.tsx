"use client";

import { useEffect, useRef, useState } from "react";
import { Box, Move3d, RotateCcw } from "lucide-react";

export type TwinSite = {
  siteId: string;
  district: string;
  division: string;
  lat: number;
  lng: number;
  towerHeight: number;
  vendor: string;
  technology: string;
  antennaCount: number;
  rruCount: number;
  bbuCount: number;
  powerModules: number;
  shelterStatus: string;
  siteStatus: string;
};

type DigitalTwinSceneProps = {
  site: TwinSite;
  activeComponent: string;
  onComponentChange: (component: string) => void;
};

export default function DigitalTwinScene({
  site,
  activeComponent,
  onComponentChange,
}: DigitalTwinSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const resetViewRef = useRef<(() => void) | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    let mounted = true;
    let frameId = 0;
    let resizeObserver: ResizeObserver | undefined;
    const host = containerRef.current;

    const initialize = async () => {
      const THREE = await import("three");
      const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");
      if (!mounted) return;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x0b1422);
      scene.fog = new THREE.Fog(0x0b1422, 20, 48);

      const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
      camera.position.set(11.5, 9.5, 14.5);

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      host.appendChild(renderer.domElement);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.06;
      controls.minDistance = 9;
      controls.maxDistance = 28;
      controls.maxPolarAngle = Math.PI * 0.48;
      controls.target.set(0.7, 3.6, 0.4);
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.48;

      resetViewRef.current = () => {
        camera.position.set(11.5, 9.5, 14.5);
        controls.target.set(0.7, 3.6, 0.4);
        controls.update();
      };

      scene.add(new THREE.HemisphereLight(0xddeeff, 0x213044, 2.5));
      const keyLight = new THREE.DirectionalLight(0xffffff, 4.2);
      keyLight.position.set(8, 15, 9);
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(2048, 2048);
      scene.add(keyLight);
      const accentLight = new THREE.PointLight(0xe40046, 18, 20);
      accentLight.position.set(-6, 7, -4);
      scene.add(accentLight);

      const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(28, 22),
        new THREE.MeshStandardMaterial({ color: 0x132238, roughness: 0.86, metalness: 0.15 }),
      );
      ground.rotation.x = -Math.PI / 2;
      ground.receiveShadow = true;
      scene.add(ground);
      const grid = new THREE.GridHelper(28, 28, 0x38516d, 0x22354b);
      grid.position.y = 0.012;
      scene.add(grid);

      const pad = new THREE.Mesh(
        new THREE.BoxGeometry(15.5, 0.18, 11.5),
        new THREE.MeshStandardMaterial({ color: 0x8d9aa8, roughness: 0.9 }),
      );
      pad.position.y = 0.09;
      pad.receiveShadow = true;
      scene.add(pad);

      const towerGroup = new THREE.Group();
      towerGroup.name = "Tower";
      scene.add(towerGroup);
      const towerMaterial = new THREE.MeshStandardMaterial({
        color: 0xbcc8d3,
        metalness: 0.82,
        roughness: 0.3,
      });
      const redMaterial = new THREE.MeshStandardMaterial({ color: 0xe40046, metalness: 0.35, roughness: 0.38 });

      const addBeam = (
        start: InstanceType<typeof THREE.Vector3>,
        end: InstanceType<typeof THREE.Vector3>,
        radius = 0.055,
        material = towerMaterial,
      ) => {
        const direction = end.clone().sub(start);
        const beam = new THREE.Mesh(
          new THREE.CylinderGeometry(radius, radius, direction.length(), 8),
          material,
        );
        beam.position.copy(start.clone().add(end).multiplyScalar(0.5));
        beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
        beam.castShadow = true;
        towerGroup.add(beam);
        return beam;
      };

      const levels = [0.25, 1.7, 3.2, 4.7, 6.2, 7.7, 9.15];
      const widthAt = (height: number) => 1.48 - height * 0.115;
      const corners = (height: number) => {
        const width = Math.max(0.36, widthAt(height));
        return [
          new THREE.Vector3(-width, height, -width),
          new THREE.Vector3(width, height, -width),
          new THREE.Vector3(width, height, width),
          new THREE.Vector3(-width, height, width),
        ];
      };

      for (let level = 0; level < levels.length - 1; level += 1) {
        const bottom = corners(levels[level]);
        const top = corners(levels[level + 1]);
        for (let corner = 0; corner < 4; corner += 1) {
          addBeam(bottom[corner], top[corner], 0.08);
          addBeam(bottom[corner], bottom[(corner + 1) % 4], 0.052);
          addBeam(bottom[corner], top[(corner + 1) % 4], 0.035, level % 2 === 0 ? redMaterial : towerMaterial);
        }
      }
      const topCorners = corners(levels[levels.length - 1]);
      for (let corner = 0; corner < 4; corner += 1) {
        addBeam(topCorners[corner], topCorners[(corner + 1) % 4], 0.05);
      }

      const antennaMaterial = new THREE.MeshStandardMaterial({ color: 0xf4f7fa, roughness: 0.48 });
      const antennaCount = Math.max(3, Math.min(site.antennaCount, 6));
      for (let index = 0; index < antennaCount; index += 1) {
        const angle = (index / antennaCount) * Math.PI * 2;
        const antenna = new THREE.Mesh(new THREE.BoxGeometry(0.38, 1.5, 0.2), antennaMaterial);
        antenna.position.set(Math.cos(angle) * 0.92, 8.55, Math.sin(angle) * 0.92);
        antenna.rotation.y = -angle + Math.PI / 2;
        antenna.rotation.z = -0.08;
        antenna.castShadow = true;
        antenna.name = "Antenna";
        towerGroup.add(antenna);
      }

      const rruVisuals = Math.max(2, Math.min(site.rruCount, 6));
      for (let index = 0; index < rruVisuals; index += 1) {
        const angle = (index / rruVisuals) * Math.PI * 2;
        const rru = new THREE.Mesh(new THREE.BoxGeometry(0.33, 0.72, 0.28), redMaterial);
        rru.position.set(Math.cos(angle) * 0.82, 7.45, Math.sin(angle) * 0.82);
        rru.rotation.y = -angle;
        rru.castShadow = true;
        rru.name = "Radio unit";
        towerGroup.add(rru);
      }

      const shelterGroup = new THREE.Group();
      shelterGroup.name = "Shelter";
      const shelter = new THREE.Mesh(
        new THREE.BoxGeometry(4.4, 2.7, 3.25),
        new THREE.MeshStandardMaterial({ color: 0xe4e9ed, roughness: 0.78 }),
      );
      shelter.position.set(4.4, 1.54, 2.25);
      shelter.castShadow = true;
      shelter.receiveShadow = true;
      shelterGroup.add(shelter);

      const roof = new THREE.Mesh(
        new THREE.BoxGeometry(4.75, 0.18, 3.55),
        new THREE.MeshStandardMaterial({ color: 0xbac5cf, roughness: 0.7 }),
      );
      roof.position.set(4.4, 2.97, 2.25);
      roof.castShadow = true;
      shelterGroup.add(roof);

      const door = new THREE.Mesh(
        new THREE.BoxGeometry(1.1, 2.0, 0.08),
        new THREE.MeshStandardMaterial({ color: 0x37495d, metalness: 0.35, roughness: 0.5 }),
      );
      door.position.set(3.4, 1.42, 0.59);
      shelterGroup.add(door);

      const cooling = new THREE.Mesh(
        new THREE.BoxGeometry(1.35, 0.95, 0.42),
        new THREE.MeshStandardMaterial({ color: 0xf5f7f9, roughness: 0.65 }),
      );
      cooling.position.set(4.8, 1.7, 0.47);
      shelterGroup.add(cooling);
      scene.add(shelterGroup);

      const rackMaterial = new THREE.MeshStandardMaterial({ color: 0x24374c, metalness: 0.52, roughness: 0.45 });
      const bbuVisuals = Math.max(1, Math.min(site.bbuCount, 3));
      for (let index = 0; index < bbuVisuals; index += 1) {
        const rack = new THREE.Mesh(new THREE.BoxGeometry(0.72, 1.45, 0.68), rackMaterial);
        rack.position.set(2.38 + index * 0.82, 0.86, -2.65);
        rack.castShadow = true;
        rack.name = "Baseband unit";
        scene.add(rack);
        for (let slot = 0; slot < 5; slot += 1) {
          const light = new THREE.Mesh(
            new THREE.BoxGeometry(0.48, 0.035, 0.012),
            new THREE.MeshBasicMaterial({ color: slot === 0 ? 0x44d39c : 0x7a8fa4 }),
          );
          light.position.set(2.38 + index * 0.82, 0.52 + slot * 0.22, -3.0);
          scene.add(light);
        }
      }

      const powerVisuals = Math.max(1, Math.min(site.powerModules, 3));
      for (let index = 0; index < powerVisuals; index += 1) {
        const power = new THREE.Mesh(
          new THREE.BoxGeometry(0.92, 1.7, 0.88),
          new THREE.MeshStandardMaterial({ color: index === 0 ? 0x52b788 : 0x3e5369, metalness: 0.3, roughness: 0.52 }),
        );
        power.position.set(6.8, 0.98, -1.7 + index * 1.15);
        power.castShadow = true;
        power.name = "Power module";
        scene.add(power);
      }

      const fenceMaterial = new THREE.MeshStandardMaterial({ color: 0x67798b, metalness: 0.75, roughness: 0.35 });
      for (const [x, z] of [[-7, -5], [-7, 5], [7, -5], [7, 5]]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.5, 8), fenceMaterial);
        post.position.set(x, 0.75, z);
        scene.add(post);
      }

      const resize = () => {
        const width = host.clientWidth;
        const height = host.clientHeight;
        if (!width || !height) return;
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      };
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(host);
      resize();

      const animate = () => {
        frameId = requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
      };
      animate();
      setReady(true);

      return () => {
        controls.dispose();
        renderer.dispose();
        renderer.domElement.remove();
        scene.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            object.geometry.dispose();
            const materials = Array.isArray(object.material) ? object.material : [object.material];
            materials.forEach((material) => material.dispose());
          }
        });
      };
    };

    let disposeScene: (() => void) | undefined;
    void initialize().then((cleanup) => {
      disposeScene = cleanup;
    });

    return () => {
      mounted = false;
      cancelAnimationFrame(frameId);
      resizeObserver?.disconnect();
      disposeScene?.();
      setReady(false);
    };
  }, [site.antennaCount, site.bbuCount, site.powerModules, site.rruCount, site.siteId]);

  const componentLabels = ["Tower", "Antenna", "Radio unit", "Shelter", "Baseband", "Power"];

  return (
    <div className="twin-scene-shell">
      <div ref={containerRef} className="twin-scene" data-testid="twin-scene" />
      {!ready && (
        <div className="scene-loading">
          <span className="scene-loader" />
          Constructing site twin
        </div>
      )}
      <div className="scene-tools" aria-label="3D model controls">
        <button type="button" onClick={() => resetViewRef.current?.()} aria-label="Reset 3D view">
          <RotateCcw size={15} />
        </button>
        <span><Move3d size={15} /> Drag to orbit · Scroll to zoom</span>
      </div>
      <div className="scene-mode"><Box size={14} /> Live geometry</div>
      <div className="component-pills" aria-label="Site components">
        {componentLabels.map((component) => (
          <button
            key={component}
            type="button"
            className={activeComponent === component ? "active" : ""}
            onClick={() => onComponentChange(component)}
          >
            {component}
          </button>
        ))}
      </div>
    </div>
  );
}

