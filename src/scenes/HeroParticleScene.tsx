"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

interface HeroParticleSceneProps {
  accent: string;
  onReady?: () => void;
  onFail?: (reason: string) => void;
}

const CONFIG = {
  CAMERA_FOV: 90,
  CAMERA_NEAR: 0.1,
  CAMERA_FAR: 1000,
  CAMERA_INITIAL_Z: 8,
  CAMERA_ZOOM_DISTANCE: 5,
  SPHERE_RADIUS: 3,
  SPHERE_Y_OFFSET: 0.5,
  SPHERE_SEGMENTS: 32,
  SPHERE_RINGS: 16,
  PARTICLES_COUNT: 3000,
  PARTICLES_COUNT_MOBILE: 1000,
  PARTICLES_RADIUS: 3.5,
  PARTICLES_START_DISTANCE: 8,
  PARTICLES_COLOR: 0xc1b28b,
  PARTICLES_OPACITY: 0.7,
  PARTICLES_SHININESS: 50,
  PARTICLES_SIZE_MIN: 0.1,
  PARTICLES_SIZE_MAX: 0.25,
  ANIMATION_DURATION: 1800,
  APPEAR_DELAY_MAX: 600,
  LIGHT_AMBIENT_INTENSITY: 5,
  LIGHT_DIRECTIONAL_INTENSITY: 3.12,
  LIGHT_DIRECTIONAL_POSITION: { x: 0, y: 4.28, z: 15 },
  ROTATION_SMOOTHNESS: 0.1,
  ROTATION_SENSITIVITY: 0.01,
  AUTO_ROTATION_SPEED: 0.0025,
  EXPLOSION_DISTANCE: 10,
  EXPLOSION_ROTATION_SPEED: 0.1,
  PARTICLES_FLOAT_AMPLITUDE: 0.15,
  PARTICLES_FLOAT_SPEED: 0.001
} as const;

interface ParticleData {
  startPosition: THREE.Vector3;
  originalPosition: THREE.Vector3;
  originalQuaternion: THREE.Quaternion;
  originalScale: THREE.Vector3;
  animationOffset: number;
  animationSpeed: number;
  radius: number;
  appearDelay: number;
  repulsionOffset: THREE.Vector3;
  targetRepulsionOffset: THREE.Vector3;
  currentBrightness: number;
  targetBrightness: number;
}

function isMobile(): boolean {
  return window.innerWidth < 991;
}

function easeOutCubic(value: number): number {
  return 1 - Math.pow(1 - value, 3);
}

function easeInOutCubic(value: number): number {
  return value < 0.5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

function generateRandomSpherePoint(radius: number, yOffset = 0): THREE.Vector3 {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  return new THREE.Vector3(
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.sin(phi) * Math.sin(theta) + yOffset,
    radius * Math.cos(phi)
  );
}

function calculateSurfaceOrientation(position: THREE.Vector3): THREE.Quaternion {
  const direction = position.clone().normalize();
  const normal = new THREE.Vector3(0, 0, 1);
  if (Math.abs(direction.dot(normal)) > 0.99) normal.set(1, 0, 0);
  const axis = new THREE.Vector3().crossVectors(normal, direction).normalize();
  const angle = Math.acos(normal.dot(direction));
  const orient = new THREE.Quaternion().setFromAxisAngle(axis, angle);
  const spin = Math.random() * Math.PI * 2;
  const twist = new THREE.Quaternion().setFromAxisAngle(direction, spin);
  return orient.multiply(twist);
}

function generateRandomScale(): THREE.Vector3 {
  const size =
    CONFIG.PARTICLES_SIZE_MIN +
    Math.random() * (CONFIG.PARTICLES_SIZE_MAX - CONFIG.PARTICLES_SIZE_MIN);
  return new THREE.Vector3(size, size, 1);
}

/**
 * The opening sphere of the reference site.
 *
 * The source site does not render a textured ball: it scatters 3000 tiny
 * instanced planes over a sphere, lights them with a Phong material, and lets
 * them fly in from an outer shell while the pointer pushes them away. This is
 * a direct port of that scene so the silhouette, grain and mouse response are
 * the same rather than an approximation.
 */
export function HeroParticleScene({ accent, onReady, onFail }: HeroParticleSceneProps) {
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

    let disposed = false;
    let failed = false;
    let readyFired = false;
    let animationFrame = 0;

    const fail = (reason: string) => {
      if (failed || disposed) return;
      failed = true;
      console.error(`[scene] ${reason}`);
      onFailRef.current?.(reason);
    };

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    } catch (error) {
      fail(`renderer-creation-failed: ${String(error)}`);
      return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      CONFIG.CAMERA_FOV,
      window.innerWidth / window.innerHeight,
      CONFIG.CAMERA_NEAR,
      CONFIG.CAMERA_FAR
    );
    camera.position.z = CONFIG.CAMERA_INITIAL_Z;

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    const canvas = renderer.domElement;
    canvas.id = "ballon-load";
    canvas.className = "canvas-ballon";
    canvas.style.transition = "opacity 0.3s ease";
    canvas.style.touchAction = "none";
    container.appendChild(canvas);

    // The invisible sphere is only used for raycasting the pointer onto the
    // ball. It is deliberately not the visible geometry.
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(
        CONFIG.SPHERE_RADIUS,
        CONFIG.SPHERE_SEGMENTS,
        CONFIG.SPHERE_RINGS
      ),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0
      })
    );
    sphere.position.y = CONFIG.SPHERE_Y_OFFSET;
    scene.add(sphere);

    const count = isMobile()
      ? CONFIG.PARTICLES_COUNT_MOBILE
      : CONFIG.PARTICLES_COUNT;
    const particleGeometry = new THREE.PlaneGeometry(0.6, 0.6);
    const particleMaterial = new THREE.MeshPhongMaterial({
      color: new THREE.Color(accent),
      transparent: true,
      depthTest: false,
      opacity: CONFIG.PARTICLES_OPACITY,
      depthWrite: false,
      side: THREE.DoubleSide,
      shininess: CONFIG.PARTICLES_SHININESS,
      specular: new THREE.Color(accent)
    });
    const particles = new THREE.InstancedMesh(
      particleGeometry,
      particleMaterial,
      count
    );
    particles.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(3 * count),
      3
    );

    const particleData: ParticleData[] = [];
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    const baseColor = new THREE.Color(accent);

    for (let index = 0; index < count; index += 1) {
      const originalPosition = generateRandomSpherePoint(
        CONFIG.PARTICLES_RADIUS,
        CONFIG.SPHERE_Y_OFFSET
      );
      const startPosition = generateRandomSpherePoint(
        CONFIG.PARTICLES_RADIUS +
          CONFIG.PARTICLES_START_DISTANCE +
          4 * Math.random(),
        CONFIG.SPHERE_Y_OFFSET
      );
      const originalQuaternion = calculateSurfaceOrientation(originalPosition);
      const originalScale = generateRandomScale();

      position.copy(startPosition);
      matrix.compose(position, originalQuaternion, originalScale);
      particles.setMatrixAt(index, matrix);
      particles.setColorAt(index, baseColor);

      particleData.push({
        startPosition,
        originalPosition,
        originalQuaternion,
        originalScale,
        animationOffset: Math.random() * Math.PI * 2,
        animationSpeed: 0.5 + Math.random(),
        radius: CONFIG.PARTICLES_RADIUS,
        appearDelay: Math.random() * CONFIG.APPEAR_DELAY_MAX,
        repulsionOffset: new THREE.Vector3(),
        targetRepulsionOffset: new THREE.Vector3(),
        currentBrightness: 0,
        targetBrightness: 0
      });
    }
    particles.instanceMatrix.needsUpdate = true;
    particles.instanceColor.needsUpdate = true;
    scene.add(particles);

    scene.add(
      new THREE.AmbientLight(0xffffff, CONFIG.LIGHT_AMBIENT_INTENSITY)
    );
    const directional = new THREE.DirectionalLight(
      0xffffff,
      CONFIG.LIGHT_DIRECTIONAL_INTENSITY
    );
    directional.position.set(
      CONFIG.LIGHT_DIRECTIONAL_POSITION.x,
      CONFIG.LIGHT_DIRECTIONAL_POSITION.y,
      CONFIG.LIGHT_DIRECTIONAL_POSITION.z
    );
    directional.target.position.set(0, 0, 0);
    scene.add(directional);
    scene.add(directional.target);

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const mouseIntersectionPoint = new THREE.Vector3();
    const targetMouseIntersectionPoint = new THREE.Vector3();
    const previousMouseIntersectionPoint = new THREE.Vector3();
    const mouseVelocity = new THREE.Vector3();
    const tempVector = new THREE.Vector3();
    const tempVector2 = new THREE.Vector3();
    const rotationMatrix = new THREE.Matrix4();
    const inverseRotation = new THREE.Matrix4();
    const shineColor = new THREE.Color(0xffd700);
    const brightenedColor = new THREE.Color();
    const tempMatrix = new THREE.Matrix4();
    const tempQuaternion = new THREE.Quaternion();
    const tempScale = new THREE.Vector3();

    let isMouseDown = false;
    let mouseX = 0;
    let mouseY = 0;
    let hasMouseIntersection = false;
    let rotationY = 0;
    let targetRotationY = 0;
    const rotationZ = 0;
    let explosionProgress = 0;
    let needsColorUpdate = false;

    const updateMouseIntersection = () => {
      raycaster.setFromCamera(mouse, camera);
      const intersections = raycaster.intersectObject(sphere);
      if (intersections.length > 0) {
        previousMouseIntersectionPoint.copy(mouseIntersectionPoint);
        targetMouseIntersectionPoint.copy(intersections[0].point);
        hasMouseIntersection = true;
        mouseIntersectionPoint.lerp(
          targetMouseIntersectionPoint,
          0.25
        );
        mouseVelocity.subVectors(
          mouseIntersectionPoint,
          previousMouseIntersectionPoint
        );
      } else {
        hasMouseIntersection = false;
        mouseVelocity.multiplyScalar(0.95);
      }
    };

    const onMouseDown = (event: MouseEvent) => {
      isMouseDown = true;
      mouseX = event.clientX;
      mouseY = event.clientY;
    };
    const onMouseMove = (event: MouseEvent) => {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = (-event.clientY / window.innerHeight) * 2 + 1;
      updateMouseIntersection();
      if (isMouseDown) {
        targetRotationY += (event.clientX - mouseX) * CONFIG.ROTATION_SENSITIVITY;
        mouseX = event.clientX;
        mouseY = event.clientY;
      }
    };
    const onMouseUp = () => {
      isMouseDown = false;
    };
    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) return;
      isMouseDown = true;
      mouseX = event.touches[0].clientX;
      mouseY = event.touches[0].clientY;
    };
    const onTouchMove = (event: TouchEvent) => {
      if (event.touches.length !== 1) return;
      mouse.x = (event.touches[0].clientX / window.innerWidth) * 2 - 1;
      mouse.y = (-event.touches[0].clientY / window.innerHeight) * 2 + 1;
      updateMouseIntersection();
      if (isMouseDown) {
        targetRotationY +=
          (event.touches[0].clientX - mouseX) * CONFIG.ROTATION_SENSITIVITY;
        mouseX = event.touches[0].clientX;
        mouseY = event.touches[0].clientY;
      }
    };
    const onTouchEnd = () => {
      isMouseDown = false;
    };

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("mousemove", onMouseMove, { passive: true });
    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: true });
    document.addEventListener("touchend", onTouchEnd);

    const onScroll = () => {
      const progress = window.scrollY / (0.5 * window.innerHeight);
      explosionProgress = Math.max(0, Math.min(1, progress));
      particleMaterial.opacity =
        explosionProgress >= 1 ? 0 : CONFIG.PARTICLES_OPACITY;
      const fadeStart = 0.5;
      const canvasFade = Math.max(
        0,
        Math.min(
          1,
          (explosionProgress - fadeStart) / (1 - fadeStart)
        )
      );
      canvas.style.opacity = String(1 - canvasFade);
      camera.position.z =
        CONFIG.CAMERA_INITIAL_Z -
        explosionProgress * CONFIG.CAMERA_ZOOM_DISTANCE;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    const updateRotation = () => {
      if (!isMouseDown) targetRotationY += CONFIG.AUTO_ROTATION_SPEED;
      rotationY += (targetRotationY - rotationY) * CONFIG.ROTATION_SMOOTHNESS;
      sphere.rotation.y = rotationY;
      sphere.rotation.z = rotationZ;
    };

    const calculateMouseRepulsion = (
      particlePosition: THREE.Vector3,
      data: ParticleData
    ) => {
      tempVector.copy(particlePosition);
      rotationMatrix.makeRotationY(rotationY);
      tempVector.applyMatrix4(rotationMatrix);
      const distance = tempVector.distanceTo(mouseIntersectionPoint);
      if (hasMouseIntersection && distance < 3.5) {
        const falloff = distance / 3.5;
        data.targetBrightness = 1 - easeOutCubic(falloff);
      } else {
        data.targetBrightness = 0;
      }

      const velocity = mouseVelocity.length();
      if (velocity > 0.001 && distance < 1.6) {
        const falloff = distance / 1.6;
        const strength = 1 - easeOutCubic(falloff);
        tempVector2.copy(mouseVelocity).normalize();
        inverseRotation.makeRotationY(-rotationY);
        tempVector2.applyMatrix4(inverseRotation);
        const push = strength * velocity * 2;
        data.targetRepulsionOffset.addScaledVector(tempVector2, push);
        const length = data.targetRepulsionOffset.length();
        if (length > 2) {
          data.targetRepulsionOffset.multiplyScalar(2 / length);
        }
      } else {
        data.targetRepulsionOffset.multiplyScalar(0.92);
      }
    };

    const updateParticles = () => {
      const elapsed = Date.now() - started;
      particleData.forEach((data, index) => {
        const localElapsed = Math.max(0, elapsed - data.appearDelay);
        const linearProgress = Math.min(
          1,
          localElapsed / CONFIG.ANIMATION_DURATION
        );
        const progress = easeInOutCubic(linearProgress);
        const current = new THREE.Vector3().lerpVectors(
          data.startPosition,
          data.originalPosition,
          progress
        );
        const wave = elapsed * CONFIG.PARTICLES_FLOAT_SPEED + data.animationOffset;
        current.x +=
          Math.sin(wave) * CONFIG.PARTICLES_FLOAT_AMPLITUDE * progress;
        current.y +=
          Math.cos(1.3 * wave) *
          CONFIG.PARTICLES_FLOAT_AMPLITUDE *
          progress;
        current.z +=
          Math.sin(0.8 * wave) *
          CONFIG.PARTICLES_FLOAT_AMPLITUDE *
          progress;

        if (progress > 0.5) calculateMouseRepulsion(current, data);
        data.repulsionOffset.lerp(data.targetRepulsionOffset, 0.1);
        current.add(data.repulsionOffset);

        const brightnessDelta =
          data.targetBrightness - data.currentBrightness;
        if (Math.abs(brightnessDelta) > 0.001) {
          data.currentBrightness += brightnessDelta * 0.1;
          if (data.currentBrightness > 0.01) {
            brightenedColor
              .copy(baseColor)
              .lerp(shineColor, data.currentBrightness * 1.5);
            particles.setColorAt(index, brightenedColor);
            needsColorUpdate = true;
          }
        }

        const quaternion = data.originalQuaternion.clone();
        const scale = data.originalScale.clone();
        if (explosionProgress > 0) {
          const direction = current.clone().normalize();
          current.add(
            direction.multiplyScalar(
              explosionProgress * CONFIG.EXPLOSION_DISTANCE
            )
          );
          tempQuaternion.setFromAxisAngle(
            direction,
            explosionProgress * CONFIG.EXPLOSION_ROTATION_SPEED
          );
          quaternion.multiply(tempQuaternion);
        } else {
          scale.multiplyScalar(progress);
        }

        tempMatrix.compose(current, quaternion, scale);
        particles.setMatrixAt(index, tempMatrix);
      });

      particles.rotation.y = rotationY;
      particles.rotation.z = rotationZ;
      particles.instanceMatrix.needsUpdate = true;
      if (needsColorUpdate) {
        particles.instanceColor!.needsUpdate = true;
        needsColorUpdate = false;
      }
    };

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    };
    window.addEventListener("resize", onResize);

    const started = Date.now();
    const animate = () => {
      if (disposed || failed) return;
      animationFrame = requestAnimationFrame(animate);
      try {
        updateRotation();
        updateParticles();
        renderer.render(scene, camera);
        if (!readyFired) {
          readyFired = true;
          onReadyRef.current?.();
        }
      } catch (error) {
        fail(`render-loop-error: ${String(error)}`);
      }
    };
    animate();

    return () => {
      disposed = true;
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
      particleGeometry.dispose();
      particleMaterial.dispose();
      sphere.geometry.dispose();
      (sphere.material as THREE.Material).dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    };
  }, [accent]);

  return <div ref={mount} className="three-particle-scene three-particle-scene--hero" />;
}
