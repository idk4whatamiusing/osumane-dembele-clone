"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

interface ThreeParticleSceneProps {
  variant: "hero" | "footer";
  model: string;
  accent: string;
}

function disposeObject(object: THREE.Object3D): void {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.geometry.dispose();
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => {
      Object.values(material).forEach((value) => {
        if (value instanceof THREE.Texture) value.dispose();
      });
      material.dispose();
    });
  });
}

export function ThreeParticleScene({ variant, model, accent }: ThreeParticleSceneProps) {
  const mount = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mount.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
    } catch {
      return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.z = variant === "hero" ? 5.2 : 6.4;
    const group = new THREE.Group();
    scene.add(group);
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);

    const count = variant === "hero" ? 1100 : 720;
    const positions = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      const radius = 2.2 + Math.random() * 3.8;
      const angle = Math.random() * Math.PI * 2;
      positions[index * 3] = Math.cos(angle) * radius;
      positions[index * 3 + 1] = (Math.random() - 0.5) * 5.5;
      positions[index * 3 + 2] = Math.sin(angle) * radius - 1.2;
    }
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const particleMaterial = new THREE.PointsMaterial({
      color: new THREE.Color(accent),
      size: variant === "hero" ? 0.026 : 0.02,
      transparent: true,
      opacity: variant === "hero" ? 0.72 : 0.48,
      depthWrite: false,
      blending: THREE.AdditiveBlending
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
    group.add(fallbackBall);
    scene.add(new THREE.AmbientLight(0xffffff, 1.8));
    const keyLight = new THREE.PointLight(new THREE.Color(accent), 18, 12);
    keyLight.position.set(2.5, 3, 4);
    scene.add(keyLight);

    let disposed = false;
    let loadedModel: THREE.Object3D | undefined;
    if (model) {
      new GLTFLoader().load(
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

    const pointer = new THREE.Vector2();
    const onPointerMove = (event: PointerEvent) => {
      pointer.x = (event.clientX / window.innerWidth - 0.5) * 2;
      pointer.y = (event.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });

    const resize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (!width || !height) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
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

    const started = performance.now();
    renderer.setAnimationLoop(() => {
      if (!visible) return;
      const elapsed = (performance.now() - started) / 1000;
      group.rotation.y = elapsed * 0.075 + pointer.x * 0.16;
      group.rotation.x = Math.sin(elapsed * 0.22) * 0.08 - pointer.y * 0.08;
      particles.rotation.z = elapsed * 0.018;
      fallbackBall.rotation.x = elapsed * 0.16;
      fallbackBall.rotation.y = elapsed * 0.22;
      if (loadedModel?.visible) {
        loadedModel.rotation.y = elapsed * 0.18;
        loadedModel.rotation.x = Math.sin(elapsed * 0.35) * 0.1;
      }
      renderer.render(scene, camera);
    });

    return () => {
      disposed = true;
      renderer.setAnimationLoop(null);
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      disposeObject(group);
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [accent, model, variant]);

  return <div ref={mount} className="three-particle-scene" />;
}
