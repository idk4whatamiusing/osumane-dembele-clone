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
  const u = Math.random();
  // Radial density fitted to the reference profile: 16% solid core,
  // 27% rim shell, 43% hollow shell, 11% mid bias, 3% outer halo.
  const radius =
    u < 0.16
      ? 1.34 * Math.cbrt(Math.random())
      : u < 0.43
        ? 1.34 * (0.95 + 0.06 * Math.random())
        : u < 0.86
          ? 1.34 * (0.6 + 0.4 * Math.random())
          : u < 0.97
            ? 1.34 * (0.6 + 0.25 * Math.random())
            : 1.34 * (1.04 + 0.47 * Math.random());
  return target.set(
    Math.sin(phi) * Math.cos(theta) * radius,
    Math.cos(phi) * radius,
    Math.sin(phi) * Math.sin(theta) * radius
  );
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
    const camera =
      variant === "hero"
        ? new THREE.PerspectiveCamera(42, 1, 0.1, 100)
        : new THREE.OrthographicCamera(-8, 8, 8, -8, 0.1, 100);
    if (camera instanceof THREE.PerspectiveCamera) {
      // The sphere of the reference site covers a little under half of the
      // height of the viewport.
      camera.position.z = 9.0;
    } else {
      camera.position.z = 16;
    }

    const group = new THREE.Group();
    const panelRing = new THREE.Group();
    scene.add(group);
    scene.add(panelRing);
    if (variant === "hero") group.position.set(0.02, 0.36, 0);
    if (variant === "footer") {
      panelRing.position.y = mobile ? -3.8 : -1.3;
      panelRing.rotation.x = mobile ? 0.32 : 0.38;
    }

    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.25 : 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = variant === "hero" ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);
    renderer.domElement.style.touchAction = "none";

    const requestedCount =
      particleCount ?? (variant === "hero" ? (mobile ? 1000 : 3000) : mobile ? 250 : 500);
    const count = Math.min(requestedCount, variant === "hero" ? (mobile ? 1000 : 1650) : 500);
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
    if (variant === "hero") {
      const colors = new Float32Array(count * 3);
      const scales = new Float32Array(count);
      // Ball gold reads brighter than the brand gold (matches reference measurements).
      const gold = new THREE.Color(accent).lerp(new THREE.Color("#f0d894"), 0.45);
      const deep = new THREE.Color("#bfa871");
      const pale = new THREE.Color("#f8f1dd");
      const olive = new THREE.Color("#adb178");
      const mixed = new THREE.Color();
      for (let index = 0; index < count; index += 1) {
        const roll = Math.random();
        if (roll < 0.44) {
          mixed.copy(gold).lerp(pale, 0.03 + Math.random() * 0.09);
        } else if (roll < 0.65) {
          mixed.copy(pale).multiplyScalar(0.92 + Math.random() * 0.08);
        } else if (roll < 0.87) {
          mixed.copy(gold).lerp(deep, Math.random() * 0.4);
        } else if (roll < 0.95) {
          mixed.copy(gold).lerp(olive, 0.1 + Math.random() * 0.25);
        } else {
          mixed.copy(deep).lerp(olive, Math.random() * 0.3);
        }
        colors[index * 3] = mixed.r;
        colors[index * 3 + 1] = mixed.g;
        colors[index * 3 + 2] = mixed.b;
        const sizeRoll = Math.random();
        let scale =
          sizeRoll < 0.38
            ? 0.55 + Math.random() * 0.35
            : sizeRoll < 0.78
              ? 0.95 + Math.random() * 0.4
              : 1.5 + Math.random() * 0.65;
        const bx = basePositions[index * 3];
        const by = basePositions[index * 3 + 1];
        const bz = basePositions[index * 3 + 2];
        if (Math.hypot(bx, by, bz) > 1.45) scale *= 0.62;
        scales[index] = scale;
      }
      particleGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      particleGeometry.setAttribute("aScale", new THREE.BufferAttribute(scales, 1));
    }
    const particleMaterial = new THREE.PointsMaterial({
      color: variant === "hero" ? 0xffffff : new THREE.Color(accent),
      vertexColors: variant === "hero",
      size: variant === "hero" ? (mobile ? 0.09 : 0.095) : 0.022,
      transparent: true,
      opacity: variant === "hero" ? 1 : 0.5,
      depthWrite: false,
      blending: THREE.NormalBlending
    });
    if (variant === "hero") {
      particleMaterial.onBeforeCompile = (shader) => {
        shader.vertexShader = shader.vertexShader
          .replace(
            "void main() {",
            "attribute float aScale;\nvarying float vAngle;\nvoid main() {\n\tvAngle = fract(aScale * 7.13) * 6.2831853;"
          )
          .replace("gl_PointSize = size;", "gl_PointSize = size * aScale;");
        shader.fragmentShader = shader.fragmentShader.replace(
          "void main() {",
          "varying float vAngle;\nvoid main() {\n\tvec2 shardCoord = mat2(cos(vAngle), -sin(vAngle), sin(vAngle), cos(vAngle)) * (gl_PointCoord - 0.5) + 0.5;\n\tif (shardCoord.x < 0.0 || shardCoord.x > 1.0 || shardCoord.y < 0.0 || shardCoord.y > 1.0) discard;"
        );
      };
    }
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
            new THREE.PlaneGeometry(mobile ? 3.7 : 4.9, mobile ? 2.2 : 2.7, 8, 1),
            new THREE.MeshStandardMaterial({
              map: texture,
              transparent: true,
              opacity: 1,
              side: THREE.DoubleSide,
              roughness: 0.62,
              metalness: 0.06
            })
          );
          const angle = (index / Math.max(textures.length, 1)) * Math.PI * 2;
          const radius = mobile ? 6.4 : 8.0;
          panel.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
          panel.rotation.set(0.08, -angle + Math.PI / 2, 0);
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
          const scale = (mobile ? 7.6 : 10.5) / Math.max(size.x, size.y, size.z, 0.001);
          loadedModel.scale.setScalar(scale);
          loadedModel.position.sub(center.multiplyScalar(scale));
          loadedModel.position.y -= mobile ? 5.0 : 2.4;
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
    window.addEventListener("osumane:audio-complete", onAudioComplete);

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
      // Cap the drawing buffer so high-DPI/4K windows cannot exhaust GPU memory.
      const dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.5);
      const capped = Math.min(dpr, Math.sqrt(2_600_000 / (width * height)));
      renderer.setPixelRatio(Math.max(capped, 0.5));
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

    const started = performance.now();
    renderer.setAnimationLoop(() => {
      if (failed || disposed || !visible) return;
      if (contextLost) {
        if (performance.now() - contextLostAt > 2500) {
          fail("webglcontextlost not restored within 2.5s");
        }
        return;
      }
      const elapsed = (performance.now() - started) / 1000;
      try {
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
          particleMaterial.opacity = 1 * (1 - progress * 0.92);
          group.scale.setScalar(1 + progress * 0.55);
          group.rotation.y = elapsed * 0.075 + pointer.x * 0.16;
          group.rotation.x = Math.sin(elapsed * 0.22) * 0.08 - pointer.y * 0.08;
          renderer.domElement.style.opacity = `${1 - progress * 0.88}`;
        } else {
          panelRing.rotation.y = elapsed * 0.08 + pointer.x * 0.12;
          panelRing.rotation.x =
            (mobile ? 0.32 : 0.38) + Math.sin(elapsed * 0.16) * 0.05 - pointer.y * 0.05;
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
      } catch (error) {
        fail(`render-loop-error: ${String(error)}`);
        return;
      }
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
      renderer.domElement.removeEventListener("webglcontextlost", onContextLost);
      renderer.domElement.removeEventListener("webglcontextrestored", onContextRestored);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("osumane:audio-complete", onAudioComplete);
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
