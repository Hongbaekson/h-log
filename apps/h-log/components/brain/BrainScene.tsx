"use client";

import { useEffect, useRef, type RefObject } from "react";
import { AdditiveBlending, BufferGeometry, CanvasTexture, Color, Float32BufferAttribute, LineBasicMaterial, LineSegments, MOUSE, PerspectiveCamera, Plane, Raycaster, Scene, Sprite, SpriteMaterial, TOUCH, Vector2, Vector3, WebGLRenderer } from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { brainKindColors, brainTopics, type BrainGraph } from "@/lib/brain";
import { layoutBrainGraph, type BrainLayout } from "@/lib/brain-layout";

export type BrainSceneHandle = { reset: () => void; zoom: (factor: number) => void };
type Props = {
  graph: BrainGraph; matches: BrainGraph; selectedId?: string; layout: BrainLayout;
  spread: number; color: "kind" | "topic"; labels: boolean; paused: boolean; revision: number;
  apiRef: RefObject<BrainSceneHandle | null>; onSelect: (id: string | null) => void; onUnavailable: () => void;
};

export default function BrainScene(props: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const live = useRef(props);
  const refresh = useRef<(() => void) | null>(null);
  useEffect(() => { live.current = props; refresh.current?.(); });
  const { graph, layout, spread, revision, apiRef } = props;

  useEffect(() => {
    const host = hostRef.current!;
    let renderer: WebGLRenderer;
    try { renderer = new WebGLRenderer({ antialias: true }); }
    catch { live.current.onUnavailable(); return; }
    const nodes = layoutBrainGraph(graph, layout, spread);
    const scene = new Scene();
    scene.background = new Color("#0a0a0a");
    const camera = new PerspectiveCamera(50, 1, .1, 10000);
    const canvas = renderer.domElement;
    canvas.tabIndex = 0;
    canvas.setAttribute("aria-label", "그래프 카메라. 방향키로 이동, 더하기와 빼기로 확대·축소, Home으로 전체 보기");
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    host.appendChild(canvas);
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = .08;
    controls.autoRotateSpeed = .35;
    controls.enableRotate = layout === "brain";
    controls.mouseButtons.LEFT = layout === "brain" ? MOUSE.ROTATE : MOUSE.PAN;
    controls.touches.ONE = layout === "brain" ? TOUCH.ROTATE : TOUCH.PAN;
    controls.listenToKeyEvents(canvas);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const textureCanvas = document.createElement("canvas");
    textureCanvas.width = textureCanvas.height = 64;
    const ctx = textureCanvas.getContext("2d")!;
    const glow = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    glow.addColorStop(0, "#ffffff");
    glow.addColorStop(.12, "#ffffff");
    glow.addColorStop(.25, "#ffffffa0");
    glow.addColorStop(.55, "#ffffff24");
    glow.addColorStop(1, "#ffffff00");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, 64, 64);
    const texture = new CanvasTexture(textureCanvas);
    const overlay = document.createElement("div");
    overlay.className = "memory-stars";
    host.appendChild(overlay);
    const stars = nodes.map(node => {
      const material = new SpriteMaterial({ map: texture, color: brainKindColors[node.kind], transparent: true, depthWrite: false, blending: AdditiveBlending });
      const sprite = new Sprite(material);
      sprite.position.set(node.x, node.y, node.z);
      sprite.scale.setScalar(10 + Math.sqrt(node.degree) * 4);
      scene.add(sprite);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "memory-star";
      button.setAttribute("aria-label", `${node.title} 읽기`);
      button.title = node.title;
      const label = document.createElement("span");
      label.className = "memory-star-label";
      label.textContent = node.title;
      button.appendChild(label);
      overlay.appendChild(button);
      return { node, sprite, button, label };
    });
    const byId = new Map(stars.map(star => [star.node.id, star]));
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new Float32BufferAttribute(new Float32Array(graph.edges.length * 6), 3));
    geometry.setAttribute("color", new Float32BufferAttribute(new Float32Array(graph.edges.length * 6), 3));
    const lineMaterial = new LineBasicMaterial({ vertexColors: true, transparent: true, opacity: .65 });
    scene.add(new LineSegments(geometry, lineMaterial));
    let dirty = true;
    const updateEdges = () => {
      graph.edges.forEach((edge, index) => {
        const a = byId.get(edge.from)!.sprite.position;
        const b = byId.get(edge.to)!.sprite.position;
        geometry.attributes.position.setXYZ(index * 2, a.x, a.y, a.z);
        geometry.attributes.position.setXYZ(index * 2 + 1, b.x, b.y, b.z);
      });
      geometry.attributes.position.needsUpdate = true;
      geometry.computeBoundingSphere();
      dirty = true;
    };
    updateEdges();
    let selected: string | undefined;
    function appearance() {
      const current = live.current;
      const matched = new Set(current.matches.nodes.map(node => node.id));
      const neighbors = new Set(current.matches.edges.filter(edge => edge.from === current.selectedId || edge.to === current.selectedId).flatMap(edge => [edge.from, edge.to]));
      if (current.selectedId) neighbors.add(current.selectedId);
      controls.autoRotate = layout === "brain" && !current.paused && !reducedMotion.matches && !current.selectedId;
      stars.forEach(({node, sprite, button}) => {
        const active = matched.has(node.id) && (!current.selectedId || neighbors.has(node.id));
        const color = current.color === "topic" ? brainTopics[node.topic].color : brainKindColors[node.kind];
        sprite.material.color.set(color);
        sprite.material.opacity = active ? 1 : .14;
        button.style.setProperty("--star-color", color);
        button.classList.toggle("is-dimmed", !active);
        button.classList.toggle("is-selected", node.id === current.selectedId);
        button.setAttribute("aria-pressed", String(node.id === current.selectedId));
        button.tabIndex = matched.has(node.id) ? 0 : -1;
        button.style.pointerEvents = matched.has(node.id) ? "" : "none";
      });
      const edgeKeys = new Set(current.matches.edges.map(edge => `${edge.from}|${edge.to}|${edge.relation}`));
      graph.edges.forEach((edge, index) => {
        const active = edgeKeys.has(`${edge.from}|${edge.to}|${edge.relation}`) && (!current.selectedId || edge.from === current.selectedId || edge.to === current.selectedId);
        const color = new Color(active ? (current.selectedId ? "#d9d4b7" : "#777b82") : "#202125");
        geometry.attributes.color.setXYZ(index * 2, color.r, color.g, color.b);
        geometry.attributes.color.setXYZ(index * 2 + 1, color.r, color.g, color.b);
      });
      geometry.attributes.color.needsUpdate = true;
      if (current.selectedId && current.selectedId !== selected) {
        const offset = camera.position.clone().sub(controls.target);
        const target = byId.get(current.selectedId)!.sprite.position.clone();
        if (window.innerWidth >= 768) {
          const worldPerPixel = 2 * offset.length() * Math.tan(camera.fov * Math.PI / 360) / host.clientHeight;
          target.addScaledVector(new Vector3(1,0,0).applyQuaternion(camera.quaternion), Math.min(560, host.clientWidth * .6) / 2 * worldPerPixel);
        }
        controls.target.copy(target);
        camera.position.copy(target).add(offset);
      }
      selected = current.selectedId;
      dirty = true;
    }
    refresh.current = appearance;
    function fit(overview = true) {
      const radius = Math.max(70, ...stars.map(star => star.sprite.position.length())) / spread;
      const distance = !overview && layout === "brain" ? radius * 1.9 : radius * spread / Math.sin(camera.fov * Math.PI / 360) * 1.08 / Math.min(camera.aspect, 1);
      controls.target.set(0, 0, 0);
      camera.position.set(0, layout === "brain" ? radius * .13 : 0, distance);
      controls.minDistance = 35;
      controls.maxDistance = distance * 5;
      controls.update();
      dirty = true;
    }
    function resize() {
      camera.aspect = host.clientWidth / Math.max(host.clientHeight, 1);
      camera.updateProjectionMatrix();
      renderer.setSize(host.clientWidth, host.clientHeight);
      dirty = true;
    }
    resize();
    fit(false);
    appearance();
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    const zoom = (factor: number) => {
      const offset = camera.position.clone().sub(controls.target);
      offset.setLength(Math.max(controls.minDistance, Math.min(controls.maxDistance, offset.length() * factor)));
      camera.position.copy(controls.target).add(offset);
      dirty = true;
    };
    apiRef.current = { reset: () => fit(), zoom };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); live.current.onSelect(null); }
      if (["+", "=", "-", "Home"].includes(event.key)) {
        event.preventDefault();
        if (event.key === "Home") fit(); else zoom(event.key === "-" ? 1.2 : 1 / 1.2);
      }
    };
    canvas.addEventListener("keydown", onKey);
    let gestureStart: {x:number;y:number} | null = null;
    const onCanvasDown = (event: PointerEvent) => {
      gestureStart = event.isPrimary && event.button === 0 ? {x:event.clientX,y:event.clientY} : null;
    };
    const onCanvasUp = (event: PointerEvent) => {
      if (gestureStart && Math.hypot(event.clientX-gestureStart.x,event.clientY-gestureStart.y) <= 4 && live.current.selectedId) live.current.onSelect(null);
      gestureStart = null;
    };
    const onCanvasCancel = () => { gestureStart = null; };
    canvas.addEventListener("pointerdown", onCanvasDown);
    canvas.addEventListener("pointerup", onCanvasUp);
    canvas.addEventListener("pointercancel", onCanvasCancel);
    const onLoss = (event: Event) => { event.preventDefault(); live.current.onUnavailable(); };
    canvas.addEventListener("webglcontextlost", onLoss);
    const ray = new Raycaster();
    const plane = new Plane();
    const pointer = new Vector2();
    let dragging: { star: typeof stars[number]; x: number; y: number; moved: boolean } | null = null;
    stars.forEach(star => {
      star.button.onpointerdown = event => {
        if (event.button !== 0) return;
        dragging = {star, x:event.clientX, y:event.clientY, moved:false};
        plane.setFromNormalAndCoplanarPoint(camera.getWorldDirection(new Vector3()), star.sprite.position);
        star.button.setPointerCapture(event.pointerId);
        controls.enabled = false;
      };
      star.button.onpointermove = event => {
        if (!dragging || dragging.star !== star) return;
        if (Math.hypot(event.clientX-dragging.x, event.clientY-dragging.y) > 4) dragging.moved = true;
        if (!dragging.moved) return;
        const rect = host.getBoundingClientRect();
        pointer.set((event.clientX-rect.left)/rect.width*2-1, 1-(event.clientY-rect.top)/rect.height*2);
        ray.setFromCamera(pointer, camera);
        ray.ray.intersectPlane(plane, star.sprite.position);
        updateEdges();
      };
      star.button.onpointerup = event => {
        const moved = dragging?.moved;
        dragging = null;
        controls.enabled = true;
        star.button.releasePointerCapture(event.pointerId);
        if (!moved) live.current.onSelect(star.node.id);
      };
      star.button.onpointercancel = () => { dragging = null; controls.enabled = true; };
      star.button.onclick = event => { if (event.detail === 0) live.current.onSelect(star.node.id); };
      star.button.onfocus = () => { dirty = true; };
    });
    const projected = new Vector3();
    const orderedStars = [...stars].sort((a,b) => b.node.degree-a.node.degree);
    const prominent = new Set(orderedStars.slice(0,8).map(star => star.node.id));
    let frame = 0;
    function render() {
      frame = requestAnimationFrame(render);
      if (document.hidden) return;
      const changed = controls.update();
      if (!dirty && !changed) return;
      renderer.render(scene, camera);
      const labelBoxes: {x:number;y:number;width:number}[] = [];
      const labelOrder = [...orderedStars].sort((a,b) => Number(b.node.id === live.current.selectedId)-Number(a.node.id === live.current.selectedId));
      labelOrder.forEach(({node, sprite, button, label}) => {
        projected.copy(sprite.position).project(camera);
        const x = (projected.x+1)*host.clientWidth/2;
        const y = (1-projected.y)*host.clientHeight/2;
        button.hidden = !(projected.z > -1 && projected.z < 1 && x > 10 && x < host.clientWidth-10 && y > 10 && y < host.clientHeight-10);
        button.style.transform = `translate3d(${x}px,${y}px,0) translate(-50%,-50%)`;
        const width = Math.min(210, label.offsetWidth);
        const candidates = [[12,-8],[12,16],[-width-12,-8],[-width-12,16],[12,-32]];
        const position = candidates.find(([dx,dy]) => {
          const left=x+dx, top=y+dy;
          return left>12 && left+width<host.clientWidth-12 && top>85 && top<host.clientHeight-75 &&
            labelBoxes.every(box => left+width+8<box.x || left>box.x+box.width+8 || top+22<box.y || top>box.y+22);
        });
        const show = !button.hidden && live.current.labels && Boolean(position) && (prominent.has(node.id) || node.id === live.current.selectedId);
        const [dx,dy] = position ?? [Math.max(12-x, Math.min(12,host.clientWidth-x-width-12)), 16];
        label.style.left = `${15+dx}px`;
        label.style.top = `${15+dy}px`;
        label.classList.toggle("is-shown", show);
        if (show) labelBoxes.push({x:x+dx,y:y+dy,width});
      });
      dirty = false;
    }
    render();
    reducedMotion.addEventListener("change", appearance);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      reducedMotion.removeEventListener("change", appearance);
      canvas.removeEventListener("keydown", onKey);
      canvas.removeEventListener("pointerdown", onCanvasDown);
      canvas.removeEventListener("pointerup", onCanvasUp);
      canvas.removeEventListener("pointercancel", onCanvasCancel);
      canvas.removeEventListener("webglcontextlost", onLoss);
      controls.dispose();
      stars.forEach(star => star.sprite.material.dispose());
      texture.dispose();
      geometry.dispose();
      lineMaterial.dispose();
      renderer.dispose();
      overlay.remove();
      canvas.remove();
      apiRef.current = null;
      refresh.current = null;
    };
  }, [graph, layout, spread, revision, apiRef]);
  return <div className="memory-scene" ref={hostRef} />;
}
