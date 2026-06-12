import React, { useEffect, useRef } from "react";
import * as THREE from "three";

// gaussian falloff sprite: bright core fading to transparent, no hard edge
function createGlowTexture() {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const half = size / 2;
  const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.2, "rgba(255,255,255,0.8)");
  gradient.addColorStop(0.5, "rgba(255,255,255,0.15)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

function throttle(func: Function, limit: number) {
  let lastCall = 0;
  return function (...args: any[]) {
    const now = Date.now();
    if (now - lastCall >= limit) {
      lastCall = now;
      func(...args);
    }
  };
}

const StarBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const speedRef = useRef(0.05); // initial speed

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // initialize renderer
    const renderer = new THREE.WebGLRenderer({ canvas });
    renderer.setClearColor(new THREE.Color("#171717"));
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);

    // initialize scene and camera
    const scene = new THREE.Scene();
    const fov = 75,
      aspect = window.innerWidth / window.innerHeight,
      near = 0.1,
      far = 1000;
    const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    camera.position.z = 5;

    // add light
    const light = new THREE.AmbientLight(0xffffff, 2);
    scene.add(light);

    const pointLight = new THREE.PointLight(0xffffff, 2);
    scene.add(pointLight);

    // load texture
    const glowTexture = createGlowTexture();

    // create particles
    const particlesGeometry = new THREE.BufferGeometry();
    const particleCount = 3000;
    const vertices = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      vertices[i * 3] = (Math.random() - 0.5) * 20; // X axis
      vertices[i * 3 + 1] = (Math.random() - 0.5) * 20; // Y axis
      vertices[i * 3 + 2] = (Math.random() - 0.5) * 50; // Z axis
    }
    particlesGeometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));

    const particlesMaterial = new THREE.PointsMaterial({
      map: glowTexture,
      size: 0.08,
      color: "#fff",
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const stars = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(stars);

    // adjust window size
    const handleResize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      if (prefersReducedMotion) {
        renderer.render(scene, camera);
      }
    };
    window.addEventListener("resize", handleResize);

    // animation logic
    let currentSpeed = 0.01;
    let scrollBoost = 0;
    let frameId = 0;
    let idleTimer: ReturnType<typeof setTimeout>;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // mouse move trigger deceleration
    const handleMouseMove = throttle(() => {
      // deceleration
      if (speedRef.current !== 0.0005) {
        speedRef.current = 0.0005;
      }

      // stop moving restore speed
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        if (speedRef.current !== 0.05) {
          speedRef.current = 0.05;
        }
      }, 10000); // 10 seconds without movement
    }, 100); // trigger every 100ms

    // pointer position steers the camera view angle (eased toward target in animate)
    const pointerTarget = { x: 0, y: 0 };
    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      const point = "touches" in e ? e.touches[0] : e;
      if (!point) return;
      pointerTarget.x = (point.clientX / window.innerWidth) * 2 - 1;
      pointerTarget.y = (point.clientY / window.innerHeight) * 2 - 1;
      handleMouseMove();
    };

    // scroll velocity maps to flight speed: scroll down flies forward, scroll up reverses
    const layoutContainer = document.getElementById("layout-container");
    let lastScrollTop = layoutContainer?.scrollTop ?? 0;
    const handleScroll = () => {
      const scrollTop = layoutContainer?.scrollTop ?? 0;
      scrollBoost = Math.max(-0.4, Math.min(0.4, scrollBoost + (scrollTop - lastScrollTop) * 0.0015));
      lastScrollTop = scrollTop;
      handleMouseMove();
    };

    if (!prefersReducedMotion) {
      window.addEventListener("mousemove", handlePointerMove);
      window.addEventListener("touchmove", handlePointerMove);
      layoutContainer?.addEventListener("scroll", handleScroll);
    }

    const animate = () => {
      scrollBoost *= 0.94; // boost decays back to base speed once scrolling stops
      const targetSpeed = speedRef.current + scrollBoost;
      currentSpeed += (targetSpeed - currentSpeed) * 0.1;

      if (Math.abs(targetSpeed - currentSpeed) < 0.00001) {
        currentSpeed = targetSpeed;
      }

      const positions = particlesGeometry.attributes.position.array as Float32Array;

      for (let i = 0; i < particleCount; i++) {
        positions[i * 3 + 2] += currentSpeed;
        if (positions[i * 3 + 2] > 25) {
          positions[i * 3 + 2] = -25;
        }
        if (positions[i * 3 + 2] < -25) {
          positions[i * 3 + 2] = 25;
        }
      }

      particlesGeometry.attributes.position.needsUpdate = true;

      // ease the view angle toward where the pointer is
      camera.rotation.y += (pointerTarget.x * -0.12 - camera.rotation.y) * 0.04;
      camera.rotation.x += (pointerTarget.y * -0.08 - camera.rotation.x) * 0.04;

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };

    if (prefersReducedMotion) {
      renderer.render(scene, camera); // static starfield, no animation loop
    } else {
      animate();
    }

    if (canvasRef.current) {
      canvasRef.current.style.opacity = "1";
    }

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("touchmove", handlePointerMove);
      layoutContainer?.removeEventListener("scroll", handleScroll);
      cancelAnimationFrame(frameId);
      clearTimeout(idleTimer);
      particlesGeometry.dispose();
      particlesMaterial.dispose();
      glowTexture.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: "block",
        position: "absolute",
        inset: 0,
        zIndex: -1,
        width: "100%",
        height: "100vh",
        opacity: 0,
        transition: "opacity 1500ms ease-out",
      }}
    ></canvas>
  );
};

export default StarBackground;
