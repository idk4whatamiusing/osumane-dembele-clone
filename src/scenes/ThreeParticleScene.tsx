"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { HeroParticleScene } from "./HeroParticleScene";

interface ThreeParticleSceneProps {
  variant: "hero" | "footer";
  model: string;
  hdr?: string;
  textures?: string[];
  particleCount?: number;
  accent: string;
  onReady?: () => void;
  onFail?: (reason: string) => void;
}

export function ThreeParticleScene(props: ThreeParticleSceneProps) {
  if (props.variant === "hero") {
    return (
      <HeroParticleScene
        accent={props.accent}
        onReady={props.onReady}
        onFail={props.onFail}
      />
    );
  }
  return <FooterParticleScene {...props} />;
}

function disposeMaterial(material: THREE.Material): void {
  Object.values(material).forEach((value) => {
    if (value instanceof THREE.Texture) value.dispose();
  });
  material.dispose();
}

function disposeObject(object: THREE.Object3D): void {
  object.traverse((child) => {
    if (
      !(
        child instanceof THREE.Mesh ||
        child instanceof THREE.Points ||
        child instanceof THREE.Line ||
        child instanceof THREE.InstancedMesh
      )
    ) {
      return;
    }
    child.geometry.dispose();
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach(disposeMaterial);
  });
}

/**
 * The reference footer photos are not flat planes: each one is a shallow
 * curved card. The curve is what makes the ring read as one continuous band
 * instead of ten separate rectangles.
 */
function curvedPanelGeometry(
  width: number,
  height: number,
  curve = 0.3,
  segmentsX = 30,
  segmentsY = 20
): THREE.PlaneGeometry {
  const geometry = new THREE.PlaneGeometry(width, height, segmentsX, segmentsY);
  const position = geometry.attributes.position;
  for (let index = 0; index < position.count; index += 1) {
    const angle = (position.getX(index) / width) * curve;
    const radius = 1 / curve;
    position.setX(index, Math.sin(angle) * radius * width);
    position.setZ(index, -(Math.cos(angle) - 1) * radius * width);
  }
  geometry.computeVertexNormals();
  return geometry;
}

function damp(current: number, target: number, amount: number, delta: number): number {
  return current + (target - current) * Math.min(amount * delta * 60, 1);
}

interface FooterParticle {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  velocity: number;
  rotationSpeed: THREE.Vector3;
  initialY: number;
  initialX: number;
  swing: number;
}

function FooterParticleScene({
  variant,
  model,
  hdr,
  textures = [],
  particleCount,
  accent,
  onReady,
  onFail
}: ThreeParticleSceneProps) {
  const mount = useRef<HTMLDivElement>(null);
  const onReadyRef = useRef(onReady);
  const onFailRef = useRef(onFail);
  useEffect(() => {
    onReadyRef.current = onReady;
    onFailRef.current = onFail;
  });

  useEffect(() => {
    const container = mount.current;
    if (!container) return;

    const debug = new URLSearchParams(window.location.search).get("debug") === "scene";
    let disposed = false;
    let failed = false;
    let readyFired = false;
    const fail = (reason: string) => {
      if (failed || disposed) return;
      failed = true;
      console.error(`[scene] ${reason}`);
      onFailRef.current?.(reason);
    };

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "high-performance"
      });
    } catch (error) {
      fail(`renderer-creation-failed: ${String(error)}`);
      return;
    }
    if (debug) console.info(`[scene] init variant=${variant} particles=${particleCount ?? "default"}`);

    const mobile = window.matchMedia("(max-width: 991px)").matches;
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-9, 9, 9, -9, 0.1, 1000);
    camera.position.set(0, 0, 10);
    camera.lookAt(0, -3, 0);

    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    container.appendChild(renderer.domElement);
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";

    scene.add(new THREE.AmbientLight(0xffffff, 2.5));
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
    keyLight.position.set(5, 5, 5);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0xffffff, 1.5);
    rimLight.position.set(-5, 5, -5);
    scene.add(rimLight);
    const fillLight = new THREE.DirectionalLight(0xffffff, 1);
    fillLight.position.set(0, -5, 0);
    scene.add(fillLight);

    const group = new THREE.Group();
    group.position.y = -5;
    group.rotation.z = THREE.MathUtils.degToRad(8);
    scene.add(group);

    const photoRing: THREE.Mesh[] = [];
    const panelGeometry = curvedPanelGeometry(6, 3.375);
    const textureLoader = new THREE.TextureLoader();
    textureLoader.setCrossOrigin("anonymous");
    const loadedTextures: THREE.Texture[] = [];

    textures.forEach((texturePath, index) => {
      const material = new THREE.MeshStandardMaterial({
        map: null,
        side: THREE.DoubleSide,
        metalness: 0,
        roughness: 1,
        envMap: null
      });
      const panel = new THREE.Mesh(panelGeometry, material);
      const angle = (index / Math.max(textures.length, 1)) * Math.PI * 2;
      panel.position.set(Math.sin(angle) * 10, 0, Math.cos(angle) * 10);
      panel.rotation.y = Math.PI + angle;
      panel.userData.initialAngle = angle;
      panel.castShadow = true;
      panel.receiveShadow = true;
      group.add(panel);
      photoRing.push(panel);

      textureLoader.load(
        texturePath,
        (texture) => {
          if (disposed) {
            texture.dispose();
            return;
          }
          texture.colorSpace = THREE.SRGBColorSpace;
          loadedTextures.push(texture);
          material.map = texture;
          material.needsUpdate = true;
        },
        undefined,
        () => undefined
      );
    });

    let environment: THREE.Texture | undefined;
    if (hdr) {
      new RGBELoader().load(
        hdr,
        (texture) => {
          if (disposed) {
            texture.dispose();
            return;
          }
          texture.mapping = THREE.EquirectangularReflectionMapping;
          environment = texture;
          trophy?.traverse((child) => {
            if (!(child instanceof THREE.Mesh)) return;
            const material = child.material;
            if (material instanceof THREE.MeshStandardMaterial) {
              material.envMap = texture;
              material.envMapIntensity = 1;
              material.needsUpdate = true;
            }
          });
        },
        undefined,
        () => undefined
      );
    }

    let trophy: THREE.Group | undefined;
    let trophyScale = 0;
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath("https://www.gstatic.com/draco/v1/decoders/");
    if (model) {
      const loader = new GLTFLoader();
      loader.setDRACOLoader(dracoLoader);
      loader.load(
        model,
        (gltf) => {
          if (disposed) {
            disposeObject(gltf.scene);
            return;
          }
          const loaded = gltf.scene;
          const pivot = loaded.getObjectByName("Object_6") ?? null;

          const bounds = new THREE.Box3().setFromObject(loaded);
          const size = bounds.getSize(new THREE.Vector3());
          const scale = (2 / Math.max(size.x, size.y, size.z, 0.001)) * 7;
          const root = new THREE.Group();

          if (pivot) {
            const worldPosition = new THREE.Vector3();
            pivot.getWorldPosition(worldPosition);
            loaded.position.set(
              -worldPosition.x - 0.15,
              -worldPosition.y,
              -worldPosition.z
            );
            loaded.scale.setScalar(scale);
            root.position.y = -6.5;
          } else {
            const center = bounds.getCenter(new THREE.Vector3());
            loaded.position.set(-center.x, -center.y, -center.z);
            loaded.scale.setScalar(scale);
            root.position.y = -7;
          }

          loaded.traverse((child) => {
            if (!(child instanceof THREE.Mesh)) return;
            child.castShadow = true;
            child.receiveShadow = true;
            const material = child.material;
            if (material instanceof THREE.MeshStandardMaterial) {
              material.metalness = 1;
              material.roughness = 0.1;
              const color = new THREE.Color(0xefff00);
              color.offsetHSL(0, -0.75, 0);
              material.color.copy(color);
              if (environment) {
                material.envMap = environment;
                material.envMapIntensity = 1;
              }
              material.needsUpdate = true;
            }
          });

          root.add(loaded);
          root.scale.setScalar(0);
          group.add(root);
          trophy = root;
        },
        undefined,
        () => undefined
      );
    }

    const requestedParticles = particleCount ?? (mobile ? 250 : 500);
    const count = Math.min(requestedParticles, mobile ? 250 : 500);
    const particleGeometry = new THREE.BoxGeometry(
      mobile ? 0.15 : 0.1,
      mobile ? 0.3 : 0.2,
      mobile ? 0.03 : 0.02
    );
    const particleMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(accent),
      metalness: 0,
      roughness: 1,
      emissive: new THREE.Color(accent),
      emissiveIntensity: 0.3
    });
    const particles = new THREE.InstancedMesh(
      particleGeometry,
      particleMaterial,
      count
    );
    particles.visible = false;
    particles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(particles);

    const particleData: FooterParticle[] = [];
    const matrix = new THREE.Matrix4();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3(1, 1, 1);
    for (let index = 0; index < count; index += 1) {
      const position = new THREE.Vector3(
        (Math.random() - 0.5) * 30,
        10 + Math.random() * 3,
        (Math.random() - 0.5) * 20
      );
      const rotation = new THREE.Euler(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      quaternion.setFromEuler(rotation);
      matrix.compose(position, quaternion, scale);
      particles.setMatrixAt(index, matrix);
      particleData.push({
        position,
        rotation,
        velocity: 0.05 + Math.random() * 0.05,
        rotationSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 0.1,
          (Math.random() - 0.5) * 0.1,
          (Math.random() - 0.5) * 0.1
        ),
        initialY: position.y,
        initialX: position.x,
        swing: Math.random() * Math.PI * 2
      });
    }
    particles.instanceMatrix.needsUpdate = true;

    let holding = false;
    let ringAngle = 0;
    let targetRingAngle = 0;
    let radius = 10;
    let targetRadius = 10;
    let holdSpeed = 0.005;

    const resetParticles = () => {
      particleData.forEach((particle, index) => {
        particle.position.set(
          particle.initialX,
          particle.initialY,
          particle.position.z
        );
        particle.swing = Math.random() * Math.PI * 2;
        quaternion.setFromEuler(particle.rotation);
        matrix.compose(particle.position, quaternion, scale);
        particles.setMatrixAt(index, matrix);
      });
      particles.instanceMatrix.needsUpdate = true;
    };

    const onHoldStart = () => {
      holding = true;
      holdSpeed = 0.005;
      targetRadius = 9.5;
      particles.visible = true;
      resetParticles();
    };
    const onHoldEnd = () => {
      holding = false;
      holdSpeed = 0.005;
      targetRadius = 10;
    };
    window.addEventListener("osumane:hold-start", onHoldStart);
    window.addEventListener("osumane:hold-end", onHoldEnd);

    const resize = () => {
      const width = container.clientWidth || window.innerWidth;
      const height = container.clientHeight || window.innerHeight;
      const aspect = width / Math.max(height, 1);
      const isMobile = width < 991;
      const frustum = isMobile ? 30 : 18;
      const topOffset = isMobile ? 5 : 0;
      camera.left = (-frustum * aspect) / 2;
      camera.right = (frustum * aspect) / 2;
      camera.top = frustum / 2 + topOffset;
      camera.bottom = -frustum / 2 + topOffset;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(width, height, false);
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    resize();

    let visible = true;
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    visibilityObserver.observe(container);

    let contextLost = false;
    let contextLostAt = 0;
    const onContextLost = (event: Event) => {
      event.preventDefault();
      contextLost = true;
      contextLostAt = performance.now();
      if (!readyFired) fail("webglcontextlost before first render");
      else if (debug) console.warn("[scene] context lost, waiting for restore");
    };
    const onContextRestored = () => {
      contextLost = false;
      if (debug) console.info("[scene] context restored");
    };
    renderer.domElement.addEventListener("webglcontextlost", onContextLost);
    renderer.domElement.addEventListener("webglcontextrestored", onContextRestored);

    let previousTime = 0;
    renderer.setAnimationLoop((time) => {
      if (failed || disposed || !visible) return;
      if (contextLost) {
        if (performance.now() - contextLostAt > 2500) {
          fail("webglcontextlost not restored within 2.5s");
        }
        return;
      }

      const delta = previousTime ? Math.min(0.05, (time - previousTime) / 1000) : 0.016;
      previousTime = time;

      if (!holding) targetRingAngle += 0.0008 * delta * 60;
      if (holding) {
        holdSpeed = Math.min(0.15, holdSpeed + 0.0015 * delta * 60);
        targetRingAngle += holdSpeed * delta * 60;
      }
      ringAngle = damp(ringAngle, targetRingAngle, 0.05, delta);
      radius = damp(radius, targetRadius, 0.1, delta);

      if (trophy) {
        trophyScale = Math.min(1, trophyScale + delta / 0.8);
        const eased =
          trophyScale < 1
            ? 1 + 2.7 * Math.pow(trophyScale - 1, 3) + 1.7 * Math.pow(trophyScale - 1, 2)
            : 1;
        trophy.scale.setScalar(eased);
        trophy.rotation.y = -2 * ringAngle;
      }

      photoRing.forEach((panel) => {
        const angle = (panel.userData.initialAngle as number) + ringAngle;
        panel.position.set(Math.sin(angle) * radius, 0, Math.cos(angle) * radius);
        panel.rotation.y = Math.PI + angle;
      });

      if (particles.visible) {
        let allBelow = true;
        for (let index = 0; index < particleData.length; index += 1) {
          const particle = particleData[index];
          particle.position.y -= particle.velocity * delta * 60;
          particle.swing += 0.02 * delta * 60;
          particle.position.x = particle.initialX + 0.5 * Math.sin(particle.swing);
          particle.rotation.x += particle.rotationSpeed.x * delta * 60;
          particle.rotation.y += particle.rotationSpeed.y * delta * 60;
          particle.rotation.z += particle.rotationSpeed.z * delta * 60;
          if (particle.position.y < -10 && holding) {
            particle.position.y = particle.initialY;
            particle.swing = Math.random() * Math.PI * 2;
          }
          if (particle.position.y > -10) allBelow = false;
          quaternion.setFromEuler(particle.rotation);
          matrix.compose(particle.position, quaternion, scale);
          particles.setMatrixAt(index, matrix);
        }
        particles.instanceMatrix.needsUpdate = true;
        if (allBelow && !holding) particles.visible = false;
      }

      renderer.render(scene, camera);
      if (!readyFired && renderer.domElement.width > 0) {
        readyFired = true;
        onReadyRef.current?.();
      }
    });

    return () => {
      disposed = true;
      renderer.setAnimationLoop(null);
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      window.removeEventListener("osumane:hold-start", onHoldStart);
      window.removeEventListener("osumane:hold-end", onHoldEnd);
      renderer.domElement.removeEventListener("webglcontextlost", onContextLost);
      renderer.domElement.removeEventListener("webglcontextrestored", onContextRestored);
      dracoLoader.dispose();
      environment?.dispose();
      loadedTextures.forEach((texture) => texture.dispose());
      disposeObject(group);
      disposeObject(particles);
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [accent, hdr, model, particleCount, textures, variant]);

  return <div ref={mount} className="three-particle-scene" />;
}
