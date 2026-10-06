"use client";

import { useEffect, useRef, type RefObject } from "react";
import { brainKindColors, brainTopics, type BrainGraph } from "@/lib/brain";
import { brainUnit, layoutBrainGraph, type BrainLayout, type PositionedBrainNode } from "@/lib/brain-layout";

export type BrainSceneHandle = { reset: () => void; fit: () => void; zoom: (factor: number) => void };
type Props = {
  graph: BrainGraph; matches: BrainGraph; selectedId: string | null; layout: BrainLayout;
  spread: number; color: "kind" | "topic"; labels: boolean; paused: boolean;
  apiRef: RefObject<BrainSceneHandle | null>; onSelect: (id: string | null) => void;
  onHover: (id: string | null) => void; onUnavailable: () => void;
};
type Point = { x: number; y: number; z: number; scale: number };
type SceneNode = PositionedBrainNode & { radius: number; floatPhase: number; floatAmp: number; floatSpeed: number };
type Batch = { positions: Float32Array; colors: Float32Array; sizes: Float32Array; count: number };

// Ported from the local UI: screen-space soft strips and additive point sprites.
// It consumes only the public graph; no embedded snapshot or file loader is used.
function createPainter(gl: WebGLRenderingContext) {
  const shaders: WebGLShader[] = [];
  const handles: WebGLBuffer[] = [];
  const program = gl.createProgram()!;
  const dispose = () => { shaders.forEach(shader => gl.deleteShader(shader)); handles.forEach(buffer => gl.deleteBuffer(buffer)); gl.deleteProgram(program); };
  try {
    const sources = [
      `attribute vec2 a_position; attribute vec4 a_color; attribute float a_size; varying vec4 v_color;
       void main() { gl_Position = vec4(a_position, 0.0, 1.0); gl_PointSize = a_size; v_color = a_color; }`,
      `precision mediump float; uniform bool u_points; varying vec4 v_color;
       void main() {
         if (u_points) {
           vec2 delta = gl_PointCoord - vec2(0.5, 0.5);
           float dist = length(delta) * 2.0;
           float core = smoothstep(0.55, 0.0, dist);
           float halo = smoothstep(1.0, 0.25, dist) * 0.35;
           gl_FragColor = vec4(v_color.rgb, v_color.a * (core + halo));
         } else { gl_FragColor = v_color; }
       }`,
    ];
    sources.forEach((source, index) => {
      const shader = gl.createShader(index === 0 ? gl.VERTEX_SHADER : gl.FRAGMENT_SHADER)!;
      shaders.push(shader);
      gl.shaderSource(shader, source); gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error("Graph shader compilation failed");
      gl.attachShader(program, shader);
    });
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error("Graph program linking failed");
    const attributes = ["a_position", "a_color", "a_size"].map(name => gl.getAttribLocation(program, name));
    const pointsUniform = gl.getUniformLocation(program, "u_points");
    const buffers = attributes.map(() => { const handle = gl.createBuffer()!; handles.push(handle); return {handle, byteLength:0}; });
    const maxPointSize = Math.min(96, gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE)[1] || 64);
    const colorCache = new Map<string, number[]>();
    let width = 1, height = 1, dpr = 1;
    function batch(capacity: number): Batch {
      return {positions:new Float32Array(capacity * 2), colors:new Float32Array(capacity * 4), sizes:new Float32Array(capacity), count:0};
    }
    const lines = batch(4096), points = batch(2048);
    function vertex(batch: Batch, x: number, y: number, color: string, alpha: number, size = 1) {
      if (batch.count >= batch.sizes.length) {
        const positions = new Float32Array(batch.positions.length * 2), colors = new Float32Array(batch.colors.length * 2), sizes = new Float32Array(batch.sizes.length * 2);
        positions.set(batch.positions); colors.set(batch.colors); sizes.set(batch.sizes);
        Object.assign(batch, {positions, colors, sizes});
      }
      let rgb = colorCache.get(color);
      if (!rgb) { rgb = [1,3,5].map(offset => parseInt(color.slice(offset, offset + 2),16) / 255); colorCache.set(color,rgb); }
      const i = batch.count++;
      batch.positions.set([x / width * 2 - 1, 1 - y / height * 2], i * 2);
      batch.colors.set([...rgb, alpha], i * 4);
      batch.sizes[i] = Math.min(maxPointSize, Math.max(1,size * dpr));
    }
    function line(a: Point, b: Point, color: string, endColor: string, alpha: number, stroke: number) {
      const dx = b.x - a.x, dy = b.y - a.y, length = Math.hypot(dx,dy) || 1;
      const nx = -dy / length, ny = dx / length, half = stroke * .5;
      const offsets = [-half - .65, -half, half, half + .65], opacity = [0,alpha,alpha,0];
      for (let i = 0; i < 3; i++) {
        const lo = offsets[i], hi = offsets[i+1];
        vertex(lines,a.x+nx*lo,a.y+ny*lo,color,opacity[i]);
        vertex(lines,b.x+nx*lo,b.y+ny*lo,endColor,opacity[i]);
        vertex(lines,a.x+nx*hi,a.y+ny*hi,color,opacity[i+1]);
        vertex(lines,a.x+nx*hi,a.y+ny*hi,color,opacity[i+1]);
        vertex(lines,b.x+nx*lo,b.y+ny*lo,endColor,opacity[i]);
        vertex(lines,b.x+nx*hi,b.y+ny*hi,endColor,opacity[i+1]);
      }
    }
    function drawBatch(batch: Batch, asPoints: boolean) {
      if (!batch.count) return;
      gl.uniform1i(pointsUniform,asPoints ? 1 : 0);
      [batch.positions,batch.colors,batch.sizes].forEach((data,i) => {
        const components = [2,4,1][i], buffer = buffers[i];
        gl.bindBuffer(gl.ARRAY_BUFFER,buffer.handle);
        if (buffer.byteLength < data.byteLength) { buffer.byteLength = data.byteLength; gl.bufferData(gl.ARRAY_BUFFER,buffer.byteLength,gl.DYNAMIC_DRAW); }
        gl.bufferSubData(gl.ARRAY_BUFFER,0,data.subarray(0,batch.count*components));
        gl.enableVertexAttribArray(attributes[i]); gl.vertexAttribPointer(attributes[i],components,gl.FLOAT,false,0,0);
      });
      gl.drawArrays(asPoints ? gl.POINTS : gl.TRIANGLES,0,batch.count);
    }
    return {
      dispose, line,
      point: (p: Point, color: string, alpha: number, size: number) => vertex(points,p.x,p.y,color,alpha,Math.min(maxPointSize,size)),
      begin: (w: number, h: number, ratio: number) => {
        width = w; height = h; dpr = ratio; lines.count = points.count = 0;
        gl.viewport(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight);
        gl.clearColor(.043,.043,.043,1); gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(program); gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA,gl.ONE); gl.disable(gl.DEPTH_TEST);
      },
      finish: () => { drawBatch(lines,false); drawBatch(points,true); },
    };
  } catch (error) { dispose(); throw error; }
}

export default function BrainScene(props: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelsRef = useRef<HTMLCanvasElement>(null);
  const targetsRef = useRef<HTMLDivElement>(null);
  const live = useRef(props);
  const refresh = useRef<(() => void) | null>(null);
  useEffect(() => { live.current = props; refresh.current?.(); });
  const { graph, apiRef } = props;

  useEffect(() => {
    const canvas = canvasRef.current!, labelCanvas = labelsRef.current!, targets = targetsRef.current!;
    const gl = canvas.getContext("webgl",{alpha:false,antialias:false,depth:false,powerPreference:"high-performance"});
    const ctx = labelCanvas.getContext("2d");
    if (!gl || !ctx) { live.current.onUnavailable(); return; }
    let painter: ReturnType<typeof createPainter>;
    try { painter = createPainter(gl); } catch { live.current.onUnavailable(); return; }
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const buttons = new Map([...targets.querySelectorAll<HTMLButtonElement>("[data-node]")].map(button => [button.dataset.node!,button]));
    const font = getComputedStyle(canvas).fontFamily;
    let nodes: SceneNode[] = [], byId = new Map<string,SceneNode>();
    let projected = new Map<string,Point>();
    let previousGraph: BrainGraph | null = null, previousLayout = "", previousSpread = 0;
    let hovered: string | null = null, frame = 0, disposed = false, lastFrame = 0;
    const state = {width:1,height:1,dpr:1,zoom:1.28,targetZoom:1.28,rotX:-.18,rotY:.35,rotZ:.02,panX:0,panY:0,driftX:0,driftY:0,now:0};
    let defaultZoom=1.28, hasSize=false;
    const pointers = new Map<number,{x:number;y:number}>();
    let dragging = false, dragged: string | null = null, panning = false, moved = false, downX = 0, downY = 0;
    const moving = () => !reducedMotion.matches && !live.current.paused;
    const initialZoom = () => 1.28 * (window.innerWidth < 768 ? Math.min(1,state.width/640) : 1);
    const color = (node: SceneNode) => live.current.color === "topic" ? brainTopics[node.topic].color : brainKindColors[node.kind];
    const viewMatrix = () => ({cy:Math.cos(state.rotY),sy:Math.sin(state.rotY),cx:Math.cos(state.rotX),sx:Math.sin(state.rotX),cz:Math.cos(state.rotZ),sz:Math.sin(state.rotZ)});
    function project(node: SceneNode, view = viewMatrix()): Point {
      const amp = moving() ? node.floatAmp * .84 : 0, phase = node.floatPhase, t = state.now * .00046 * node.floatSpeed;
      const x = node.x + Math.sin(t*1.08+phase)*amp, y = node.y + Math.cos(t*.86+phase*1.17)*amp, z = node.z + Math.sin(t*.62+phase*1.71)*amp;
      const x1=x*view.cy-z*view.sy, z1=x*view.sy+z*view.cy, y1=y*view.cx-z1*view.sx, z2=y*view.sx+z1*view.cx;
      const x2=x1*view.cz-y1*view.sz, y2=x1*view.sz+y1*view.cz, scale=780/(780+z2)*state.zoom;
      return {x:state.width*.5+state.panX+state.driftX+x2*scale,y:state.height*.55+state.panY+state.driftY+y2*scale,z:z2,scale};
    }
    function setHover(id: string | null) {
      if (id === hovered) return;
      hovered = id; live.current.onHover(id); requestDraw();
    }
    function syncLayout(force = false) {
      const options = live.current;
      if (!force && previousGraph === options.matches && previousLayout === options.layout && previousSpread === options.spread) return;
      nodes = layoutBrainGraph(options.matches,options.layout,options.spread).map(node => ({...node,
        radius:node.kind === "solution" ? 4.2 : node.kind === "learning" || node.kind === "experience" ? 3.6 : 3.2,
        floatPhase:brainUnit(node.id,8)*Math.PI*2,floatAmp:5+brainUnit(node.id,9)*12,floatSpeed:.78+brainUnit(node.id,10)*.44,
      }));
      byId = new Map(nodes.map(node => [node.id,node]));
      previousGraph = options.matches; previousLayout = options.layout; previousSpread = options.spread;
      buttons.forEach(button => { button.hidden = true; });
      setHover(null);
    }
    function draw() {
      const options = live.current, selected = options.selectedId;
      painter.begin(state.width,state.height,state.dpr); ctx!.clearRect(0,0,state.width,state.height);
      const focus = new Set<string>();
      if (selected) {
        focus.add(selected);
        graph.edges.forEach(edge => { if (edge.from === selected) focus.add(edge.to); if (edge.to === selected) focus.add(edge.from); });
      }
      const view = viewMatrix();
      projected = new Map(nodes.map(node => [node.id,project(node,view)]));
      options.matches.edges.forEach(edge => {
        const source=byId.get(edge.from)!, target=byId.get(edge.to)!;
        const a=projected.get(edge.from)!, b=projected.get(edge.to)!;
        const active=[edge.from,edge.to].includes(selected ?? "") || [edge.from,edge.to].includes(hovered ?? "");
        const depth=Math.min(1.28,Math.max(.72,(a.scale+b.scale)*.5));
        const pulseSeed=`${edge.from}|${edge.to}|${edge.relation}`;
        const pulse=options.layout === "brain" && !selected && moving() ? 1+.22*Math.sin(state.now*(.0003+brainUnit(pulseSeed,11)*.0005)+brainUnit(pulseSeed,12)*Math.PI*2) : 1;
        const alpha=(active ? .62 : selected ? .038 : .20)*depth*pulse, width=active ? 1.3 : .8;
        painter.line(a,b,color(source),color(target),alpha,width);
        if (active) painter.line(a,b,color(source),color(target),alpha*.14,width+2.2);
      });
      const weight = nodes.reduce((sum,node) => sum+Math.max(1,node.degree),0);
      let target = brainUnit(`sparkle.${Math.floor(state.now/900)}`,13)*weight;
      const sparkle = moving() && !selected ? nodes.find(node => (target-=Math.max(1,node.degree)) <= 0)?.id : null;
      const age=(state.now%900)/1000, gain=.8*(1-Math.exp(-6*age))*Math.exp(-1.4*age);
      const labelCandidates: {node:SceneNode;p:Point;r:number;priority:number;dimmed:boolean}[] = [];
      [...nodes].sort((a,b) => projected.get(a.id)!.z-projected.get(b.id)!.z).forEach(node => {
        const p=projected.get(node.id)!, active=node.id === selected, hover=node.id === hovered;
        const focused=selected ? focus.has(node.id) || hover : hover, idle=!selected && !hover;
        const breathe=moving() ? 1+.09*Math.sin(state.now*.0009+node.floatPhase) : 1, boost=node.id === sparkle ? 1+gain : 1;
        const r=Math.max(2.5,node.radius*p.scale*1.08*breathe*Math.min(boost,1.6));
        painter.point(p,color(node),active ? .4 : hover ? .24 : focused ? .27 : idle ? .11*boost : .035,r+(active ? 24 : hover ? 18 : 13));
        painter.point(p,color(node),active ? 1 : hover ? .98 : focused ? .94 : idle ? .94*boost : .2,r+(active ? 5 : hover ? 3 : 1.2));
        if (active) painter.point(p,"#ffffff",.95,3.2);
        const button=buttons.get(node.id)!;
        button.hidden=p.x<12 || p.x>state.width-12 || p.y<12 || p.y>state.height-12;
        button.style.transform=`translate(${p.x-12}px, ${p.y-12}px)`;
        const important=node.kind === "reflection" || node.kind === "question";
        if (options.labels && (nodes.length<=32 || active || hover || focused || important || node.degree>=8)) {
          const dimmed=Boolean(selected && !focus.has(node.id) && !hover);
          labelCandidates.push({node,p,r,dimmed,priority:(active ? 1000 : hover ? 980 : important ? 180 : 125)+node.degree*9+p.scale*28+(dimmed ? 0 : 1000)});
        }
      });
      painter.finish();
      const occupied: {x:number;y:number;width:number}[] = [];
      const limit=Math.max(7,Math.min(selected ? 34 : 12,Math.floor(state.width*state.height/(selected ? 42000 : 85000))));
      labelCandidates.sort((a,b) => b.priority-a.priority).forEach(({node,p,r,dimmed}) => {
        const active=node.id === selected || node.id === hovered;
        const text=node.title.length>38 ? `${node.title.slice(0,35)}...` : node.title;
        ctx!.font=`14px ${font}`;
        const box={x:p.x+r+2,y:p.y-9,width:ctx!.measureText(text).width+20};
        // Keep the source collision guard for small catalogs too; Korean titles are longer.
        if (!active && (box.x<0 || box.x+box.width>state.width || box.y<0 || box.y+25>state.height || occupied.length>=limit || occupied.some(other => box.x<other.x+other.width && box.x+box.width>other.x && box.y<other.y+25 && box.y+25>other.y))) return;
        occupied.push(box);
        const hot=node.kind === "reflection" || node.kind === "question" || node.kind === "experience" || node.id === hovered;
        ctx!.save(); ctx!.font=`13px ${font}`;
        ctx!.globalAlpha=(active ? .98 : hot ? .76 : .58)*(dimmed ? .12 : 1);
        ctx!.shadowColor=hot ? "rgba(255,127,143,.28)" : "rgba(244,239,255,.22)";
        ctx!.shadowBlur=active ? 12 : hot ? 6 : 0;
        ctx!.fillStyle=hot ? "rgba(255,120,140,.92)" : "rgba(220,216,206,.72)";
        ctx!.beginPath(); ctx!.arc(p.x+r+4,p.y+1,2.25,0,Math.PI*2); ctx!.fill();
        ctx!.shadowBlur=0; ctx!.fillStyle=hot ? "rgba(226,226,230,.74)" : "rgba(214,214,218,.62)";
        ctx!.fillText(text,p.x+r+12,p.y+5); ctx!.restore();
      });
    }
    function requestDraw() { if (!disposed && !frame && !document.hidden) frame=requestAnimationFrame(animate); }
    function animate(now: number) {
      frame=0; syncLayout();
      const dt=(lastFrame ? Math.min(34,Math.max(8,now-lastFrame)) : 16.67)/16.67;
      lastFrame=now; state.now=now;
      state.zoom+=(state.targetZoom-state.zoom)*(moving() ? Math.min(1,.16*dt) : 1);
      if (!dragging && moving()) {
        state.rotY+=(.00082+Math.sin(now*.00037)*.0002)*dt;
        state.rotX=Math.max(-1.08,Math.min(.96,state.rotX+Math.sin(now*.00051)*.00013*dt));
        state.rotZ=Math.sin(now*.00027)*.075+Math.sin(now*.00011)*.035;
        state.driftX=Math.sin(now*.00018)*34+Math.sin(now*.00031)*12;
        state.driftY=Math.cos(now*.00021)*28+Math.sin(now*.00013)*18;
      }
      draw(); if (moving()) requestDraw();
    }
    function resize() {
      const rect=canvas.getBoundingClientRect();
      state.width=Math.max(1,rect.width); state.height=Math.max(1,rect.height); state.dpr=Math.min(1.75,window.devicePixelRatio || 1);
      const nextZoom=initialZoom();
      state.zoom=state.targetZoom=hasSize ? state.targetZoom*nextZoom/defaultZoom : nextZoom;
      defaultZoom=nextZoom; hasSize=true;
      canvas.width=Math.floor(state.width*state.dpr); canvas.height=Math.floor(state.height*state.dpr);
      const labelDpr=Math.min(1.5,window.devicePixelRatio || 1);
      labelCanvas.width=Math.floor(state.width*labelDpr); labelCanvas.height=Math.floor(state.height*labelDpr);
      ctx!.setTransform(labelDpr,0,0,labelDpr,0,0); requestDraw();
    }
    function zoom(factor: number) { state.targetZoom=Math.max(.18,Math.min(2.8,state.targetZoom*factor)); requestDraw(); }
    function reset() {
      syncLayout(true);
      Object.assign(state,{zoom:initialZoom(),targetZoom:initialZoom(),rotX:-.18,rotY:.35,rotZ:.02,panX:0,panY:0,driftX:0,driftY:0});
      requestDraw();
    }
    function fit() {
      if (!nodes.length) return;
      state.zoom=1; state.panX=state.panY=state.driftX=state.driftY=0;
      const points=nodes.map(node => project(node));
      const minX=Math.min(...points.map(p=>p.x)),maxX=Math.max(...points.map(p=>p.x)),minY=Math.min(...points.map(p=>p.y)),maxY=Math.max(...points.map(p=>p.y));
      const scale=Math.max(.18,Math.min(1.8,(state.width-100)/Math.max(1,maxX-minX),(state.height-240)/Math.max(1,maxY-minY)));
      state.zoom=state.targetZoom=scale;
      state.panX=-( (minX+maxX)/2-state.width*.5)*scale;
      state.panY=-( (minY+maxY)/2-state.height*.55)*scale;
      requestDraw();
    }
    function nearest(x: number,y: number) {
      let best: SceneNode | null=null, distance=Infinity;
      for (const node of nodes) {
        const p=projected.get(node.id); if (!p) continue;
        const d=Math.hypot(p.x-x,p.y-y);
        if (d<Math.max(live.current.selectedId ? 24 : 18,node.radius*p.scale*2.4) && d<distance) { best=node; distance=d; }
      }
      return best;
    }
    function pointerDown(event: PointerEvent) {
      if (event.button !== 0) return;
      canvas.setPointerCapture(event.pointerId);
      pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
      dragging=true; moved=pointers.size>1; downX=event.clientX; downY=event.clientY;
      panning=event.ctrlKey || pointers.size>1;
      const rect=canvas.getBoundingClientRect();
      dragged=panning ? null : nearest(event.clientX-rect.left,event.clientY-rect.top)?.id ?? null;
      setHover(null); canvas.focus({preventScroll:true});
    }
    function pointerMove(event: PointerEvent) {
      const previous=pointers.get(event.pointerId);
      if (dragging && previous) {
        const before=[...pointers.values()];
        pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
        if (pointers.size>1) {
          const after=[...pointers.values()];
          const oldDistance=Math.hypot(before[0].x-before[1].x,before[0].y-before[1].y);
          if (oldDistance>0) zoom(Math.hypot(after[0].x-after[1].x,after[0].y-after[1].y)/oldDistance);
          state.panX+=(event.clientX-previous.x)/2; state.panY+=(event.clientY-previous.y)/2;
          moved=true;
        } else {
          const dx=event.clientX-previous.x,dy=event.clientY-previous.y;
          moved ||= Math.abs(event.clientX-downX)+Math.abs(event.clientY-downY)>4;
          if (panning) { state.panX+=dx; state.panY+=dy; }
          else if (dragged) {
            const node=byId.get(dragged), p=projected.get(dragged);
            if (node && p) {
              const v=viewMatrix(), vx=(dx*v.cz+dy*v.sz)/p.scale, vy=(-dx*v.sz+dy*v.cz)/p.scale, vz=-vy*v.sx;
              node.x+=vx*v.cy+vz*v.sy; node.y+=vy*v.cx; node.z+=-vx*v.sy+vz*v.cy;
            }
          } else { state.rotY+=dx*.006; state.rotX=Math.max(-1.2,Math.min(1.2,state.rotX+dy*.004)); }
        }
        canvas.style.cursor="grabbing"; requestDraw(); return;
      }
      const rect=canvas.getBoundingClientRect(), hit=nearest(event.clientX-rect.left,event.clientY-rect.top);
      setHover(hit?.id ?? null); canvas.style.cursor=event.ctrlKey ? "move" : hit ? "grab" : "default";
    }
    function pointerEnd(event: PointerEvent) {
      if (!pointers.has(event.pointerId)) return;
      pointers.delete(event.pointerId);
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
      if (event.type === "pointerup" && !panning && !moved) {
        const rect=canvas.getBoundingClientRect();
        live.current.onSelect(nearest(event.clientX-rect.left,event.clientY-rect.top)?.id ?? null);
      }
      dragging=pointers.size>0; dragged=null;
      if (!dragging) panning=false;
      canvas.style.cursor="default"; requestDraw();
    }
    function pointerLeave() { if (!dragging) setHover(null); }
    function wheel(event: WheelEvent) { event.preventDefault(); zoom(Math.exp(-event.deltaY*.0012)); }
    function keyDown(event: KeyboardEvent) {
      if (["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","+","=","-","Home","Escape"].includes(event.key)) event.preventDefault(); else return;
      if (event.key === "Home") fit();
      else if (event.key === "+" || event.key === "=") zoom(1.2);
      else if (event.key === "-") zoom(1/1.2);
      else if (event.key === "Escape") live.current.onSelect(null);
      else if (event.ctrlKey) { state.panX+=event.key === "ArrowLeft" ? -25 : event.key === "ArrowRight" ? 25 : 0; state.panY+=event.key === "ArrowUp" ? -25 : event.key === "ArrowDown" ? 25 : 0; }
      else { state.rotY+=event.key === "ArrowLeft" ? -.08 : event.key === "ArrowRight" ? .08 : 0; state.rotX+=event.key === "ArrowUp" ? -.08 : event.key === "ArrowDown" ? .08 : 0; }
      requestDraw();
    }
    function focusNode(event: FocusEvent) { setHover((event.target as HTMLElement).dataset.node ?? null); }
    function contextLost(event: Event) { event.preventDefault(); live.current.onUnavailable(); }
    function visibilityChanged() { if (document.hidden) { cancelAnimationFrame(frame); frame=0; } else { lastFrame=0; requestDraw(); } }
    canvas.addEventListener("pointerdown",pointerDown); canvas.addEventListener("pointermove",pointerMove);
    canvas.addEventListener("pointerup",pointerEnd); canvas.addEventListener("pointercancel",pointerEnd); canvas.addEventListener("pointerleave",pointerLeave);
    canvas.addEventListener("wheel",wheel,{passive:false}); canvas.addEventListener("keydown",keyDown); canvas.addEventListener("webglcontextlost",contextLost);
    targets.addEventListener("focusin",focusNode); targets.addEventListener("focusout",pointerLeave);
    reducedMotion.addEventListener("change",requestDraw); document.addEventListener("visibilitychange",visibilityChanged);
    const observer=new ResizeObserver(resize); observer.observe(canvas);
    refresh.current=requestDraw; apiRef.current={reset,fit,zoom};
    syncLayout(); resize();
    return () => {
      disposed=true; cancelAnimationFrame(frame); observer.disconnect(); refresh.current=null; apiRef.current=null;
      canvas.removeEventListener("pointerdown",pointerDown); canvas.removeEventListener("pointermove",pointerMove);
      canvas.removeEventListener("pointerup",pointerEnd); canvas.removeEventListener("pointercancel",pointerEnd); canvas.removeEventListener("pointerleave",pointerLeave);
      canvas.removeEventListener("wheel",wheel); canvas.removeEventListener("keydown",keyDown); canvas.removeEventListener("webglcontextlost",contextLost);
      targets.removeEventListener("focusin",focusNode); targets.removeEventListener("focusout",pointerLeave);
      reducedMotion.removeEventListener("change",requestDraw); document.removeEventListener("visibilitychange",visibilityChanged);
      painter.dispose();
    };
  }, [graph,apiRef]);

  return <>
    <canvas id="mem-canvas" ref={canvasRef} tabIndex={0} aria-label="Second Brain 그래프. 드래그로 회전, Ctrl과 드래그로 이동, 스크롤과 두 손가락으로 확대. 방향키로 회전, 더하기와 빼기로 확대·축소, Home으로 전체 보기" />
    <canvas id="mem-label-canvas" ref={labelsRef} aria-hidden="true" />
    <div className="mem-node-targets" ref={targetsRef} aria-label="그래프 노드">{graph.nodes.map(node => <button type="button" className="mem-node-target" data-node={node.id} key={node.id} aria-label={`${node.title} 읽기`} aria-pressed={props.selectedId === node.id} onClick={() => props.onSelect(node.id)} />)}</div>
  </>;
}
