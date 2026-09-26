"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";

interface ThreeParticleSceneProps {
  variant: "hero" | "footer";
  model: string;
  hdr?: string;
  textures?: string[];
  particleCount?: number;
  accent: string;
}

function disposeMaterial(material: THREE.Material): void {
  Object.values(material).forEach((value) => {
    if (value instanceof THREE.Texture) value.dispose();
  });
  material.dispose();
}

function disposeObject(object: THREE.Object3D): void {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh || child instanceof THREE.Points || child instanceof THREE.Line)) {
      return;
    }
    child.geometry.dispose();
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach(disposeMaterial);
  });
}

function randomUnitVector(target: THREE.Vector3): THREE.Vector3 {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  const radius = 2.35 + Math.random() * 0.35;
  return target.set(
    Math.sin(phi) * Math.cos(theta) * radius,
    Math.cos(phi) * radius,
    Math.sin(phi) * Math.sin(theta) * radius
  );
}

export function ThreeParticleScene({
  variant,
  model,
  hdr,
  textures = [],
  particleCount,
  accent
}: ThreeParticleSceneProps) {
  const mount = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mount.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "high-performance"
      });
    } catch {
      return;
    }

    const mobile = window.matchMedia("(max-width: 991px)").matches;
    const scene = new THREE.Scene();
    const camera =
      variant === "hero"
        ? new THREE.PerspectiveCamera(42, 1, 0.1, 100)
        : new THREE.OrthographicCamera(-8, 8, 8, -8, 0.1, 100);
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.position.z = 6.6;
    } else {
      camera.position.z = 16;
    }

    const group = new THREE.Group();
    const panelRing = new THREE.Group();
    scene.add(group);
    scene.add(panelRing);

    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.25 : 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);
    renderer.domElement.style.touchAction = "none";

    const requestedCount =
      particleCount ?? (variant === "hero" ? (mobile ? 1000 : 3000) : mobile ? 250 : 500);
    const count = Math.min(requestedCount, variant === "hero" ? 3000 : 500);
    const basePositions = new Float32Array(count * 3);
    const positions = new Float32Array(count * 3);
    const vector = new THREE.Vector3();
    for (let index = 0; index < count; index += 1) {
      if (variant === "hero") {
        randomUnitVector(vector);
      } else {
        vector.set(
          (Math.random() - 0.5) * 14,
          (Math.random() - 0.5) * 7,
          (Math.random() - 0.5) * 5
        );
      }
      basePositions[index * 3] = vector.x;
      basePositions[index * 3 + 1] = vector.y;
      basePositions[index * 3 + 2] = vector.z;
      positions[index * 3] = vector.x;
      positions[index * 3 + 1] = vector.y;
      positions[index * 3 + 2] = vector.z;
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const particleMaterial = new THREE.PointsMaterial({
      color: new THREE.Color(accent),
      size: variant === "hero" ? (mobile ? 0.045 : 0.028) : 0.022,
      transparent: true,
      opacity: variant === "hero" ? 0.72 : 0.5,
      depthWrite: false,
      blending: THREE.NormalBlending
    });
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    group.add(particles);

    const ballGeometry = new THREE.IcosahedronGeometry(1.08, 3);
    const ballMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(accent),
      metalness: 0.72,
      roughness: 0.24,
      transparent: true,
      opacity: 0.82
    });
    const fallbackBall = new THREE.Mesh(ballGeometry, ballMaterial);
    if (variant === "footer") group.add(fallbackBall);

    scene.add(new THREE.AmbientLight(0xffffff, 1.8));
    const keyLight = new THREE.PointLight(new THREE.Color(accent), 18, 12);
    keyLight.position.set(2.5, 3, 4);
    scene.add(keyLight);
    const rimLight = new THREE.PointLight(0xffffff, 9, 10);
    rimLight.position.set(-4, 1, 2);
    scene.add(rimLight);

    let loadedModel: THREE.Object3D | undefined;
    let environment: THREE.Texture | undefined;
    const loadedTextures: THREE.Texture[] = [];
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath("https://www.gstatic.com/draco/v1/decoders/");

    if (variant === "footer" && hdr) {
      new RGBELoader().load(hdr, (texture) => {
        if (disposed) {
          texture.dispose();
          return;
        }
        texture.mapping = THREE.EquirectangularReflectionMapping;
        environment = texture;
        scene.environment = texture;
      });
    }

    if (variant === "footer") {
      const textureLoader = new THREE.TextureLoader();
      textures.forEach((texturePath, index) => {
        textureLoader.load(texturePath, (texture) => {
          if (disposed) {
            texture.dispose();
            return;
          }
          texture.colorSpace = THREE.SRGBColorSpace;
          loadedTextures.push(texture);
          const panel = new THREE.Mesh(
            new THREE.PlaneGeometry(3.5, 2.4, 8, 1),
            new THREE.MeshStandardMaterial({
              map: texture,
              transparent: true,
              opacity: 0.72,
              side: THREE.DoubleSide,
              roughness: 0.72,
              metalness: 0.08
            })
          );
          const angle = (index / Math.max(textures.length, 1)) * Math.PI * 2;
          panel.position.set(Math.cos(angle) * 7.1, Math.sin(angle * 1.7) * 1.8, Math.sin(angle) * 7.1);
          panel.rotation.set(0.18, -angle + Math.PI / 2, Math.sin(angle) * 0.08);
          panelRing.add(panel);
        });
      });
    }

    if (variant === "footer" && model) {
      const loader = new GLTFLoader();
      loader.setDRACOLoader(dracoLoader);
      loader.load(
        model,
        (gltf) => {
          if (disposed) {
            disposeObject(gltf.scene);
            return;
          }
          loadedModel = gltf.scene;
          const bounds = new THREE.Box3().setFromObject(loadedModel);
          const size = bounds.getSize(new THREE.Vector3());
          const center = bounds.getCenter(new THREE.Vector3());
          const scale = 2.35 / Math.max(size.x, size.y, size.z, 0.001);
          loadedModel.scale.setScalar(scale);
          loadedModel.position.sub(center.multiplyScalar(scale));
          loadedModel.visible = true;
          fallbackBall.visible = false;
          group.add(loadedModel);
        },
        undefined,
        () => undefined
      );
    }

    const confettiCount = mobile ? 120 : 280;
    const confettiPositions = new Float32Array(confettiCount * 3);
    for (let index = 0; index < confettiCount; index += 1) {
      confettiPositions[index * 3] = (Math.random() - 0.5) * 12;
      confettiPositions[index * 3 + 1] = 3 + Math.random() * 7;
      confettiPositions[index * 3 + 2] = (Math.random() - 0.5) * 4;
    }
    const confettiGeometry = new THREE.BufferGeometry();
    confettiGeometry.setAttribute("position", new THREE.BufferAttribute(confettiPositions, 3));
    const confettiMaterial = new THREE.PointsMaterial({
      color: new THREE.Color(accent),
      size: 0.07,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const confetti = new THREE.Points(confettiGeometry, confettiMaterial);
    confetti.visible = false;
    panelRing.add(confetti);
    let confettiActive = false;
    const onAudioComplete = () => {
      confettiActive = true;
      confetti.visible = true;
      panelRing.scale.setScalar(1.08);
    };
    window.addEventListener("ankhi:audio-complete", onAudioComplete);

    const pointer = new THREE.Vector2();
    const onPointerMove = (event: PointerEvent) => {
      pointer.x = (event.clientX / window.innerWidth - 0.5) * 2;
      pointer.y = (event.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });

    let dragging = false;
    let previousX = 0;
    let previousY = 0;
    const onPointerDown = (event: PointerEvent) => {
      dragging = true;
      previousX = event.clientX;
      previousY = event.clientY;
      renderer.domElement.setPointerCapture(event.pointerId);
    };
    const onPointerUp = () => {
      dragging = false;
    };
    const onPointerDrag = (event: PointerEvent) => {
      if (!dragging) return;
      group.rotation.y += (event.clientX - previousX) * 0.008;
      group.rotation.x += (event.clientY - previousY) * 0.006;
      previousX = event.clientX;
      previousY = event.clientY;
    };
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointermove", onPointerDrag);
    renderer.domElement.addEventListener("pointerup", onPointerUp);
    renderer.domElement.addEventListener("pointercancel", onPointerUp);

    const resize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (!width || !height) return;
      const aspect = width / height;
      if (camera instanceof THREE.PerspectiveCamera) {
        camera.aspect = aspect;
        camera.updateProjectionMatrix();
      } else {
        camera.left = -8 * aspect;
        camera.right = 8 * aspect;
        camera.top = 8;
        camera.bottom = -8;
        camera.updateProjectionMatrix();
      }
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

    let disposed = false;
    const started = performance.now();
    renderer.setAnimationLoop(() => {
      if (!visible || disposed) return;
      const elapsed = (performance.now() - started) / 1000;
      if (variant === "hero") {
        const progress = THREE.MathUtils.clamp(window.scrollY / (window.innerHeight * 0.58), 0, 1);
        const expansion = 1 + progress * 3.2;
        for (let index = 0; index < count; index += 1) {
          const baseIndex = index * 3;
          const x = basePositions[baseIndex];
          const y = basePositions[baseIndex + 1];
          const z = basePositions[baseIndex + 2];
          const distance = Math.max(0.001, Math.hypot(x - pointer.x * 4, y + pointer.y * 4, z));
          const repel = progress * 0.18 + (variant === "hero" ? 0.035 : 0);
          positions[baseIndex] = x * expansion + (x / distance) * repel * (1 + Math.abs(pointer.x));
          positions[baseIndex + 1] = y * expansion + (y / distance) * repel * (1 + Math.abs(pointer.y));
          positions[baseIndex + 2] = z * expansion + (z / distance) * repel;
        }
        particleGeometry.attributes.position.needsUpdate = true;
        particleMaterial.opacity = 0.72 * (1 - progress * 0.92);
        group.scale.setScalar(1 + progress * 0.55);
        group.rotation.y = elapsed * 0.075 + pointer.x * 0.16;
        group.rotation.x = Math.sin(elapsed * 0.22) * 0.08 - pointer.y * 0.08;
        renderer.domElement.style.opacity = `${1 - progress * 0.88}`;
      } else {
        panelRing.rotation.y = elapsed * 0.08 + pointer.x * 0.12;
        panelRing.rotation.x = Math.sin(elapsed * 0.16) * 0.05 - pointer.y * 0.05;
        if (loadedModel?.visible) {
          loadedModel.rotation.y = elapsed * 0.18;
          loadedModel.rotation.x = Math.sin(elapsed * 0.35) * 0.1;
        }
        if (confettiActive) {
          const positionsAttribute = confettiGeometry.attributes.position as THREE.BufferAttribute;
          for (let index = 0; index < confettiCount; index += 1) {
            const offset = index * 3;
            positionsAttribute.array[offset + 1] -= 0.018 + (index % 7) * 0.002;
            positionsAttribute.array[offset] += Math.sin(elapsed * 2 + index) * 0.0015;
          }
          positionsAttribute.needsUpdate = true;
          panelRing.scale.lerp(new THREE.Vector3(1, 1, 1), 0.04);
        }
      }
      renderer.render(scene, camera);
    });

    return () => {
      disposed = true;
      renderer.setAnimationLoop(null);
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("ankhi:audio-complete", onAudioComplete);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointermove", onPointerDrag);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("pointercancel", onPointerUp);
      dracoLoader.dispose();
      environment?.dispose();
      loadedTextures.forEach((texture) => texture.dispose());
      disposeObject(group);
      disposeObject(panelRing);
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [accent, hdr, model, particleCount, textures, variant]);

  return <div ref={mount} className="three-particle-scene" />;
}
