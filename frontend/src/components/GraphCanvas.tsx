import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import type { NodeData, EdgeData } from '../types';

interface GraphCanvasProps {
  nodes: NodeData[];
  edges: EdgeData[];
  selectedNode: NodeData | null;
  onSelectNode: (node: NodeData | null) => void;
  maxTimestamp: number;
  minTimestamp?: number;
  timeMode?: 'cumulative' | 'slice';
  activeMotif?: 'all' | 'fan-out' | 'fan-in' | 'long-chain';
  clustersCollapsed?: boolean;
  onToggleClustering?: () => void;
  isolatedPathNodeIds?: Set<string> | null;
  layoutMode?: 'flow' | 'force';
  onNavigateToLegal?: (victim: string) => void;
}

// OSINT Entity Card Dimensions
const CARD_WIDTH = 210;
const CARD_HEIGHT = 76;
const CARD_RADIUS = 8;

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

export const GraphCanvas: React.FC<GraphCanvasProps> = ({
  nodes,
  edges,
  selectedNode,
  onSelectNode,
  maxTimestamp,
  minTimestamp: _minTimestamp = 0,
  timeMode = 'cumulative',
  activeMotif = 'all',
  clustersCollapsed: _clustersCollapsed = true,
  onToggleClustering: _onToggleClustering,
  isolatedPathNodeIds = null,
  layoutMode: _layoutMode = 'flow',
  onNavigateToLegal
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Graph size threshold: > 25 nodes uses vertical graph with single spine; <= 25 keeps horizontal flow
  const isLargeGraph = nodes.length > 25;

  // Pan & Zoom
  const [zoom, setZoom] = useState<number>(0.85);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 50, y: 70 });
  const zoomRef = useRef(zoom);
  const panRef = useRef(pan);
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);
  useEffect(() => {
    panRef.current = pan;
  }, [pan]);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hoveredNode, setHoveredNode] = useState<NodeData | null>(null);
  const [animTime, setAnimTime] = useState<number>(0);
  const [edgeViewMode, setEdgeViewMode] = useState<'focused' | 'all'>('focused');
  const [nodeDetail, setNodeDetail] = useState<any>(null);

  useEffect(() => {
    if (!selectedNode) {
      setNodeDetail(null);
      return;
    }
    fetch(`/api/accounts/${selectedNode.acct_no}`)
      .then(res => res.json())
      .then(data => setNodeDetail(data))
      .catch(() => setNodeDetail(null));
  }, [selectedNode?.acct_no]);

  // OSINT Dynamic Expansion State (Nodes expand on click to eliminate clutter)
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Adjacency maps for OSINT hierarchical expansion
  const { childrenMap } = useMemo(() => {
    const cMap = new Map<string, Set<string>>();
    edges.forEach(e => {
      if (!cMap.has(e.src_acct)) cMap.set(e.src_acct, new Set());
      cMap.get(e.src_acct)!.add(e.dst_acct);
    });
    return { childrenMap: cMap };
  }, [edges]);

  // Single Direct Spine from Victim (Top) to Terminal Cashout (Bottom) for > 25 nodes
  const { spineOrderedNodes, initialSpineNodes } = useMemo(() => {
    if (!isLargeGraph || nodes.length === 0) {
      return { spineOrderedNodes: [] as NodeData[], initialSpineNodes: new Set<string>() };
    }

    const spineSet = new Set<string>();
    const nodeMap = new Map<string, NodeData>();
    nodes.forEach(n => nodeMap.set(n.acct_no, n));

    const roots = nodes.filter(n => n.hop === 0);
    const rootNode = roots.find(r => r.layer === 'Victim') || roots[0] || nodes[0];
    if (!rootNode) return { spineOrderedNodes: [], initialSpineNodes: spineSet };

    const spineList: NodeData[] = [rootNode];
    spineSet.add(rootNode.acct_no);

    const visited = new Set<string>([rootNode.acct_no]);
    let currNode = rootNode;

    for (let step = 0; step < 8; step++) {
      const outgoing = (edges || [])
        .filter(e => e.src_acct === currNode.acct_no && !visited.has(e.dst_acct))
        .map(e => ({ edge: e, node: nodeMap.get(e.dst_acct) }))
        .filter((x): x is { edge: EdgeData; node: NodeData } => Boolean(x.node && x.node.hop > currNode.hop))
        .sort((a, b) => b.edge.amount_paise - a.edge.amount_paise);

      if (outgoing.length === 0) {
        // Fallback: any outgoing edge with highest amount
        const anyOut = (edges || [])
          .filter(e => e.src_acct === currNode.acct_no && !visited.has(e.dst_acct))
          .map(e => ({ edge: e, node: nodeMap.get(e.dst_acct) }))
          .filter((x): x is { edge: EdgeData; node: NodeData } => Boolean(x.node))
          .sort((a, b) => b.edge.amount_paise - a.edge.amount_paise);

        if (anyOut.length === 0) break;
        const nextItem = anyOut[0];
        visited.add(nextItem.node.acct_no);
        spineSet.add(nextItem.node.acct_no);
        spineList.push(nextItem.node);
        currNode = nextItem.node;
      } else {
        const nextItem = outgoing[0];
        visited.add(nextItem.node.acct_no);
        spineSet.add(nextItem.node.acct_no);
        spineList.push(nextItem.node);
        currNode = nextItem.node;
      }

      if (currNode.hop >= 4 || currNode.layer?.toLowerCase().includes('terminal')) {
        break;
      }
    }

    return { spineOrderedNodes: spineList, initialSpineNodes: spineSet };
  }, [nodes, edges, isLargeGraph]);

  // Initialize expansion:
  // <= 25 nodes: keep same, expand all
  // > 25 nodes: start with only the single spine from victim to cashout
  useEffect(() => {
    if (nodes.length === 0) return;
    const initial = new Set<string>();

    if (!isLargeGraph) {
      nodes.forEach(n => initial.add(n.acct_no));
    }
    // When > 25 nodes, start with empty expandedNodes so only initialSpineNodes are shown!
    setExpandedNodes(initial);
  }, [nodes, isLargeGraph]);

  // Animation loop for currency flow particles
  useEffect(() => {
    let animId: number;
    const animate = () => {
      setAnimTime(t => (t + 0.02) % 1.0);
      animId = requestAnimationFrame(animate);
    };
    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Container resize observer with high-DPR canvas scaling
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  // Filter edges based on temporal slider & motifs
  const visibleEdges = useMemo(() => {
    return edges.filter(e => {
      if (timeMode === 'cumulative') {
        if (e.ts_epoch > maxTimestamp) return false;
      } else {
        if (Math.abs(e.ts_epoch - maxTimestamp) > 14400) return false;
      }

      if (activeMotif === 'fan-out') {
        if (e.hop > 2 || (e.hop === 2 && e.amount_paise > 5000000)) return false;
      } else if (activeMotif === 'fan-in') {
        if (e.hop < 2) return false;
      } else if (activeMotif === 'long-chain') {
        if (e.hop === 0) return false;
      }

      if (isolatedPathNodeIds) {
        if (!isolatedPathNodeIds.has(e.src_acct) || !isolatedPathNodeIds.has(e.dst_acct)) {
          return false;
        }
      }

      return true;
    });
  }, [edges, maxTimestamp, timeMode, activeMotif, isolatedPathNodeIds]);

  // OSINT Node Visibility Computation & Vertical Layer Assignment
  // <= 25 nodes: All nodes visible
  // > 25 nodes: Vertical layers (columns) expanding to the right
  const { osintNodes, osintEdges, verticalLayerMap, parentMap } = useMemo(() => {
    const visibleAccts = new Set<string>();
    const vLayerMap = new Map<string, number>();
    const pMap = new Map<string, string>();

    if (!isLargeGraph) {
      nodes.forEach(n => visibleAccts.add(n.acct_no));
    } else {
      // 1. Initial spine nodes are assigned to Vertical Layer 0
      initialSpineNodes.forEach(acct => {
        visibleAccts.add(acct);
        vLayerMap.set(acct, 0);
      });

      // 2. BFS: For each expanded node in vertical layer L, its children are assigned to vertical layer L + 1
      const queue = Array.from(visibleAccts);
      const visited = new Set<string>(queue);

      while (queue.length > 0) {
        const curr = queue.shift()!;
        const currLayer = vLayerMap.get(curr) ?? 0;

        if (expandedNodes.has(curr)) {
          const children = childrenMap.get(curr);
          if (children) {
            children.forEach(childAcct => {
              if (!visibleAccts.has(childAcct)) {
                visibleAccts.add(childAcct);
                vLayerMap.set(childAcct, currLayer + 1);
                pMap.set(childAcct, curr);
                if (!visited.has(childAcct)) {
                  visited.add(childAcct);
                  queue.push(childAcct);
                }
              }
            });
          }
        }
      }
    }

    const filteredNodes = nodes.filter(n => visibleAccts.has(n.acct_no));
    const filteredEdges = visibleEdges.filter(e => visibleAccts.has(e.src_acct) && visibleAccts.has(e.dst_acct));

    return {
      osintNodes: filteredNodes.length > 0 ? filteredNodes : nodes,
      osintEdges: filteredEdges,
      verticalLayerMap: vLayerMap,
      parentMap: pMap
    };
  }, [nodes, visibleEdges, expandedNodes, childrenMap, isLargeGraph, initialSpineNodes]);

  // Focused connections when an account is selected or hovered
  const focusedNodeConnections = useMemo(() => {
    const activeTarget = selectedNode || hoveredNode;
    if (!activeTarget) return null;

    const targetAcct = activeTarget.acct_no;
    const connectedNodeIds = new Set<string>([targetAcct]);
    const directEdgeIds = new Set<string>();

    osintEdges.forEach(e => {
      if (e.src_acct === targetAcct) {
        connectedNodeIds.add(e.dst_acct);
        directEdgeIds.add(`${e.src_acct}->${e.dst_acct}`);
      } else if (e.dst_acct === targetAcct) {
        connectedNodeIds.add(e.src_acct);
        directEdgeIds.add(`${e.src_acct}->${e.dst_acct}`);
      }
    });

    return { connectedNodeIds, directEdgeIds, targetAcct };
  }, [selectedNode, hoveredNode, osintEdges]);

  // Layout Engine:
  // <= 25 nodes: Horizontal Hierarchical DAG (unchanged)
  // > 25 nodes: Vertical DAG with Victim on TOP and Cashout on BOTTOM; grows horizontally as nodes expand
  const { nodePositions, stageLanes, stageBands, bounds } = useMemo(() => {
    const positions = new Map<string, { x: number; y: number; w: number; h: number }>();
    const hopGroups: Record<number, NodeData[]> = { 0: [], 1: [], 2: [], 3: [], 4: [] };

    osintNodes.forEach(n => {
      const hop = Math.min(4, Math.max(0, n.hop));
      if (!hopGroups[hop]) hopGroups[hop] = [];
      hopGroups[hop].push(n);
    });

    const stageMeta = [
      { name: "STAGE 0: VICTIM ORIGIN", desc: "Complainant Account" },
      { name: "STAGE 1: COLLECTOR HUBS", desc: "Primary Inflow Splitting" },
      { name: "STAGE 2: SMURFING DISPERSAL", desc: "Layering & Churn Rings" },
      { name: "STAGE 3: AGGREGATION", desc: "Consolidation Funnels" },
      { name: "STAGE 4: CASHOUT OFF-RAMPS", desc: "Terminal ATMs & P2P" }
    ];

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

    if (!isLargeGraph) {
      // ----------------------------------------------------
      // MODE A (<= 25 nodes): Horizontal Flow (Exactly as before)
      // ----------------------------------------------------
      const laneConfigs: { subCols: number; laneWidth: number; startX: number }[] = [];
      let cumulativeX = 60;

      [0, 1, 2, 3, 4].forEach(hop => {
        const count = hopGroups[hop]?.length || 0;
        let subCols = 1;
        if (count > 24) subCols = 3;
        else if (count > 8) subCols = 2;

        const laneWidth = subCols * CARD_WIDTH + (subCols - 1) * 24 + 60;
        laneConfigs.push({ subCols, laneWidth, startX: cumulativeX });
        cumulativeX += laneWidth + 110;
      });

      const rowSpacing = CARD_HEIGHT + 24;

      [0, 1, 2, 3, 4].forEach(hop => {
        const group = hopGroups[hop];
        if (!group || group.length === 0) return;
        const conf = laneConfigs[hop];

        group.forEach((node, idx) => {
          const colIdx = idx % conf.subCols;
          const rowIdx = Math.floor(idx / conf.subCols);
          const stagger = (colIdx % 2) * (rowSpacing * 0.45);

          const x = conf.startX + 28 + colIdx * (CARD_WIDTH + 24);
          const y = 140 + rowIdx * rowSpacing + stagger;

          positions.set(node.acct_no, { x, y, w: CARD_WIDTH, h: CARD_HEIGHT });

          if (x < minX) minX = x;
          if (x + CARD_WIDTH > maxX) maxX = x + CARD_WIDTH;
          if (y < minY) minY = y;
          if (y + CARD_HEIGHT > maxY) maxY = y + CARD_HEIGHT;
        });
      });

      const stageLanes = [0, 1, 2, 3, 4].map(hop => ({
        name: stageMeta[hop].name,
        desc: stageMeta[hop].desc,
        x: laneConfigs[hop].startX,
        width: laneConfigs[hop].laneWidth,
        count: hopGroups[hop]?.length || 0
      }));

      return {
        nodePositions: positions,
        stageLanes,
        stageBands: [],
        bounds: { minX, maxX, minY, maxY }
      };
    } else {
      // ----------------------------------------------------
      // MODE B (> 25 nodes): Vertical Layers (Columns) Expanding to the Right
      // Vertical Layer 0: Primary Investigation Spine (Victim on Top, Cashout on Bottom)
      // Vertical Layer 1: Expanded children of Layer 0 nodes
      // Vertical Layer 2: Expanded children of Layer 1 nodes
      // Each vertical layer is a dedicated column of nodes expanding to the right!
      // ----------------------------------------------------
      const spineList = spineOrderedNodes.length > 0 ? spineOrderedNodes : nodes.filter(n => initialSpineNodes.has(n.acct_no));
      const spineX = 240;
      const cardW = CARD_WIDTH;
      const cardH = CARD_HEIGHT;
      const slotH = cardH + 16;
      const colGap = 480; // 6x previous 80px gap for spacious vertical layer separation
      const colWidth = cardW + colGap; // 680px

      // 1. Layout Vertical Layer 0 (Spine from Victim on top down to Cashout on bottom)
      let currentSpineY = 120;
      spineList.forEach(sNode => {
        const spineY = currentSpineY;
        positions.set(sNode.acct_no, { x: spineX, y: spineY, w: cardW, h: cardH });

        // Find direct children of this spine node that are in Vertical Layer 1
        const layer1Kids = osintNodes
          .filter(n => verticalLayerMap.get(n.acct_no) === 1 && parentMap.get(n.acct_no) === sNode.acct_no)
          .sort((a, b) => (b.taint_in_paise || 0) - (a.taint_in_paise || 0));

        if (layer1Kids.length > 0) {
          // Position children in Vertical Layer 1 next to this spine node
          layer1Kids.forEach((kid, idx) => {
            const kidX = spineX + colWidth;
            const kidY = spineY + idx * slotH;
            positions.set(kid.acct_no, { x: kidX, y: kidY, w: cardW, h: cardH });
          });
          const maxKidY = spineY + layer1Kids.length * slotH;
          currentSpineY = Math.max(spineY + 190, maxKidY + 40);
        } else {
          currentSpineY += 190;
        }
      });

      // 2. Layout deeper vertical layers (Layer 2, Layer 3, etc.)
      const maxLayer = osintNodes.reduce((max, n) => Math.max(max, verticalLayerMap.get(n.acct_no) || 0), 0);

      for (let L = 2; L <= maxLayer; L++) {
        const layerNodes = osintNodes.filter(n => verticalLayerMap.get(n.acct_no) === L);
        // Group by parent and sort by parent Y position
        layerNodes.sort((a, b) => {
          const parentA = parentMap.get(a.acct_no);
          const parentB = parentMap.get(b.acct_no);
          const yA = parentA ? (positions.get(parentA)?.y || 0) : 0;
          const yB = parentB ? (positions.get(parentB)?.y || 0) : 0;
          if (yA !== yB) return yA - yB;
          return (b.taint_in_paise || 0) - (a.taint_in_paise || 0);
        });

        let nextAvailableY = 120;
        layerNodes.forEach(node => {
          const parentAcct = parentMap.get(node.acct_no);
          const parentPos = parentAcct ? positions.get(parentAcct) : null;
          const targetY = parentPos ? parentPos.y : 120;
          const actualY = Math.max(targetY, nextAvailableY);

          const colX = spineX + L * colWidth;
          positions.set(node.acct_no, { x: colX, y: actualY, w: cardW, h: cardH });
          nextAvailableY = actualY + slotH;
        });
      }

      // Calculate bounds
      osintNodes.forEach(node => {
        const p = positions.get(node.acct_no);
        if (p) {
          if (p.x < minX) minX = p.x;
          if (p.x + cardW > maxX) maxX = p.x + cardW;
          if (p.y < minY) minY = p.y;
          if (p.y + cardH > maxY) maxY = p.y + cardH;
        }
      });

      // Stage lanes for vertical mode representing each vertical layer column!
      const stageLanes = [];
      for (let L = 0; L <= maxLayer; L++) {
        const count = osintNodes.filter(n => (verticalLayerMap.get(n.acct_no) || 0) === L).length;
        const colX = spineX + L * colWidth - 24;
        stageLanes.push({
          name: L === 0 ? "PRIMARY SPINE (TOP ➔ CASHOUT)" : `VERTICAL LAYER ${L}`,
          desc: L === 0 ? "Single Direct Trail" : `Downstream Expansion ${L}`,
          x: colX,
          width: cardW + 48,
          count
        });
      }

      return {
        nodePositions: positions,
        stageLanes,
        stageBands: [],
        bounds: { minX, maxX, minY, maxY }
      };
    }
  }, [osintNodes, isLargeGraph, spineOrderedNodes, initialSpineNodes, verticalLayerMap, parentMap]);

  // Fit View
  const fitToView = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !bounds || bounds.minX === Infinity) return;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    const graphW = bounds.maxX - bounds.minX + 80;
    const graphH = bounds.maxY - bounds.minY + 80;

    const scaleX = (width - 120) / Math.max(100, graphW);
    const scaleY = (height - 180) / Math.max(100, graphH);
    const newZoom = Math.min(1.4, Math.max(0.28, Math.min(scaleX, scaleY)));

    setZoom(newZoom);
    setPan({
      x: (width - graphW * newZoom) / 2 - bounds.minX * newZoom + 40,
      y: (height - graphH * newZoom) / 2 - bounds.minY * newZoom + 40
    });
  }, [bounds]);

  // Initial fit to view on load
  useEffect(() => {
    if (osintNodes.length > 0) {
      const timer = setTimeout(fitToView, 120);
      return () => clearTimeout(timer);
    }
  }, [osintNodes.length, fitToView]);

  // Canvas Drawing Routine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);

    // 1. Subtle Architectural Background Grid
    ctx.fillStyle = '#F4EDE4';
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Grid dots
    ctx.save();
    ctx.fillStyle = 'rgba(148, 163, 184, 0.4)';
    const gridSize = 32 * zoom;
    const offsetX = pan.x % gridSize;
    const offsetY = pan.y % gridSize;
    for (let x = offsetX; x < rect.width; x += gridSize) {
      for (let y = offsetY; y < rect.height; y += gridSize) {
        ctx.fillRect(x, y, 1.2, 1.2);
      }
    }
    ctx.restore();

    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // 2. Stage Corridor Backgrounds (Vertical Layers / Columns)
    stageLanes.forEach(lane => {
      const laneH = Math.max(700, (bounds.maxY - bounds.minY) + 260);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      roundRect(ctx, lane.x, 80, lane.width, laneH, 10);
      ctx.fill();
      ctx.strokeStyle = '#D5C7B5';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#0F172A';
      ctx.font = '700 11px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(lane.name, lane.x + 14, 104);

      ctx.fillStyle = '#64748B';
      ctx.font = '500 9px Inter, sans-serif';
      ctx.fillText(`${lane.desc} (${lane.count} visible)`, lane.x + 14, 120);
    });

    const isFocusActive = !!focusedNodeConnections;

    // 3. Draw Directed Curvature Bezier Edges between Card Ports
    osintEdges.forEach(edge => {
      const p1 = nodePositions.get(edge.src_acct);
      const p2 = nodePositions.get(edge.dst_acct);
      if (!p1 || !p2) return;

      let srcX: number, srcY: number, dstX: number, dstY: number;
      let cp1x: number, cp1y: number, cp2x: number, cp2y: number;

      if (!isLargeGraph) {
        // Horizontal Mode (<= 25 nodes): Source is right midpoint, dest is left midpoint
        srcX = p1.x + CARD_WIDTH;
        srcY = p1.y + CARD_HEIGHT / 2;
        dstX = p2.x;
        dstY = p2.y + CARD_HEIGHT / 2;

        const dx = dstX - srcX;
        const cpDist = Math.max(30, dx * 0.45);
        cp1x = srcX + cpDist;
        cp1y = srcY;
        cp2x = dstX - cpDist;
        cp2y = dstY;
      } else {
        // Vertical Mode with Vertical Layers (Columns) (> 25 nodes):
        const srcLayer = verticalLayerMap.get(edge.src_acct) ?? 0;
        const dstLayer = verticalLayerMap.get(edge.dst_acct) ?? 0;
        const isDifferentLayers = srcLayer !== dstLayer || Math.abs(p1.x - p2.x) > 10;

        if (isDifferentLayers) {
          // If two nodes belong to different layers:
          // The connection MUST start or end from the center of the left or right edges of the box!
          if (p2.x >= p1.x) {
            // Forward connection: Right edge center of src -> Left edge center of dst
            srcX = p1.x + CARD_WIDTH;
            srcY = p1.y + CARD_HEIGHT / 2;
            dstX = p2.x;
            dstY = p2.y + CARD_HEIGHT / 2;

            const dx = Math.max(40, dstX - srcX);
            const cpDist = dx * 0.45;
            cp1x = srcX + cpDist;
            cp1y = srcY;
            cp2x = dstX - cpDist;
            cp2y = dstY;
          } else {
            // Backward connection: Left edge center of src -> Right edge center of dst
            srcX = p1.x;
            srcY = p1.y + CARD_HEIGHT / 2;
            dstX = p2.x + CARD_WIDTH;
            dstY = p2.y + CARD_HEIGHT / 2;

            const dx = Math.max(40, srcX - dstX);
            const cpDist = dx * 0.45;
            cp1x = srcX - cpDist;
            cp1y = srcY;
            cp2x = dstX + cpDist;
            cp2y = dstY;
          }
        } else {
          // Intra-layer connection (both nodes in the same vertical column/spine):
          if (p2.y >= p1.y) {
            // Downward flow in same column: Bottom edge center -> Top edge center
            srcX = p1.x + CARD_WIDTH / 2;
            srcY = p1.y + CARD_HEIGHT;
            dstX = p2.x + CARD_WIDTH / 2;
            dstY = p2.y;

            const dy = Math.max(20, dstY - srcY);
            const cpDist = dy * 0.45;
            cp1x = srcX;
            cp1y = srcY + cpDist;
            cp2x = dstX;
            cp2y = dstY - cpDist;
          } else {
            // Upward flow in same column: Top edge center -> Bottom edge center
            srcX = p1.x + CARD_WIDTH / 2;
            srcY = p1.y;
            dstX = p2.x + CARD_WIDTH / 2;
            dstY = p2.y + CARD_HEIGHT;

            const dy = Math.max(20, srcY - dstY);
            const cpDist = dy * 0.45;
            cp1x = srcX;
            cp1y = srcY - cpDist;
            cp2x = dstX;
            cp2y = dstY + cpDist;
          }
        }
      }

      const isDirectlyFocused = focusedNodeConnections?.directEdgeIds.has(`${edge.src_acct}->${edge.dst_acct}`);
      const isDimmed = isFocusActive && !isDirectlyFocused && edgeViewMode === 'focused';

      // Draw Flow Curve
      ctx.beginPath();
      ctx.moveTo(srcX, srcY);
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, dstX, dstY);

      if (isDirectlyFocused) {
        ctx.strokeStyle = '#2563EB';
        ctx.lineWidth = 3.5 / Math.sqrt(zoom);
      } else if (isDimmed) {
        ctx.strokeStyle = 'rgba(210, 191, 168, 0.25)';
        ctx.lineWidth = 1 / Math.sqrt(zoom);
      } else {
        ctx.strokeStyle = edge.amount_paise > 5000000 ? '#B45309' : '#64748B';
        ctx.lineWidth = Math.min(3.5, Math.max(1.5, Math.log10(edge.amount_paise / 10000 + 1))) / Math.sqrt(zoom);
      }
      ctx.stroke();

      // Streaming Animated Currency Particle
      if (!isDimmed) {
        const t = (animTime + (edge.hop * 0.2)) % 1.0;
        const u = 1 - t;
        const px = u * u * u * srcX + 3 * u * u * t * cp1x + 3 * u * t * t * cp2x + t * t * t * dstX;
        const py = u * u * u * srcY + 3 * u * u * t * cp1y + 3 * u * t * t * cp2y + t * t * t * dstY;

        ctx.fillStyle = isDirectlyFocused ? '#2563EB' : '#D97706';
        ctx.beginPath();
        ctx.arc(px, py, (isDirectlyFocused ? 4.5 : 3.0) / Math.sqrt(zoom), 0, Math.PI * 2);
        ctx.fill();
      }

      // Directional Arrow Head near destination port
      const arrowT = 0.93;
      const au = 1 - arrowT;
      const ax = au * au * au * srcX + 3 * au * au * arrowT * cp1x + 3 * au * arrowT * arrowT * cp2x + arrowT * arrowT * arrowT * dstX;
      const ay = au * au * au * srcY + 3 * au * au * arrowT * cp1y + 3 * au * arrowT * arrowT * cp2y + arrowT * arrowT * arrowT * dstY;

      // Tangent derivative along cubic Bezier to accurately align arrow head
      const dxdt = 3 * au * au * (cp1x - srcX) + 6 * au * arrowT * (cp2x - cp1x) + 3 * arrowT * arrowT * (dstX - cp2x);
      const dydt = 3 * au * au * (cp1y - srcY) + 6 * au * arrowT * (cp2y - cp1y) + 3 * arrowT * arrowT * (dstY - cp2y);
      const angle = Math.atan2(dydt, dxdt);
      const headLen = 6 / Math.sqrt(zoom);

      ctx.save();
      ctx.fillStyle = isDirectlyFocused ? '#2563EB' : (edge.amount_paise > 5000000 ? '#B45309' : '#64748B');
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(ax - headLen * Math.cos(angle - Math.PI / 6), ay - headLen * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(ax - headLen * Math.cos(angle + Math.PI / 6), ay - headLen * Math.sin(angle + Math.PI / 6));
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    });

    // 4. Precompute Flow Statistics for Non-Duplicated Forensic Intelligence
    const flowStatsMap = new Map<string, { inCount: number; outCount: number }>();
    edges.forEach(e => {
      if (!flowStatsMap.has(e.src_acct)) flowStatsMap.set(e.src_acct, { inCount: 0, outCount: 0 });
      if (!flowStatsMap.has(e.dst_acct)) flowStatsMap.set(e.dst_acct, { inCount: 0, outCount: 0 });
      flowStatsMap.get(e.src_acct)!.outCount += 1;
      flowStatsMap.get(e.dst_acct)!.inCount += 1;
    });

    // 4. Draw Large-Sized OSINT Entity Cards
    osintNodes.forEach(node => {
      const pos = nodePositions.get(node.acct_no);
      if (!pos) return;

      const screenX = pos.x * zoom + pan.x;
      const screenY = pos.y * zoom + pan.y;
      if (screenX < -260 || screenX > rect.width + 260 || screenY < -120 || screenY > rect.height + 120) {
        return; // Viewport Culling
      }

      const isTarget = selectedNode?.acct_no === node.acct_no;
      const isHovered = hoveredNode?.acct_no === node.acct_no;
      const isConnected = isFocusActive && focusedNodeConnections.connectedNodeIds.has(node.acct_no);
      const isDimmed = isFocusActive && !isConnected && edgeViewMode === 'focused';

      const isExpanded = expandedNodes.has(node.acct_no);

      // Color Terminology Palette
      let theme = {
        border: '#2563EB',
        headerBg: '#1E40AF',
        bodyBg: '#EFF6FF',
        badgeText: 'VICTIM COMPLAINANT'
      };

      if (node.isSupernode) {
        theme = {
          border: '#0D9488',
          headerBg: '#0F766E',
          bodyBg: '#F0FDFA',
          badgeText: `SYNDICATE CLUSTER (${node.subNodeCount})`
        };
      } else if (node.hop === 0) {
        theme = {
          border: '#2563EB',
          headerBg: '#1E40AF',
          bodyBg: '#EFF6FF',
          badgeText: 'VICTIM COMPLAINANT'
        };
      } else if (node.hop === 1) {
        theme = {
          border: '#D97706',
          headerBg: '#B45309',
          bodyBg: '#FFFBEB',
          badgeText: 'L1 COLLECTOR MULE'
        };
      } else if (node.hop === 2) {
        theme = {
          border: '#7C3AED',
          headerBg: '#6D28D9',
          bodyBg: '#F5F3FF',
          badgeText: 'L2 SMURFING SPLITTER'
        };
      } else if (node.hop === 3) {
        theme = {
          border: '#DC2626',
          headerBg: '#991B1B',
          bodyBg: '#FEF2F2',
          badgeText: 'L3 TERMINAL MULE'
        };
      } else {
        theme = {
          border: '#374151',
          headerBg: '#1F2937',
          bodyBg: '#F3F4F6',
          badgeText: 'DRAINAGE CASHOUT'
        };
      }

      const { x, y, w, h } = pos;

      // 4.1 Focus Glow / Drop Shadow
      if (isTarget) {
        ctx.save();
        ctx.shadowColor = 'rgba(37, 99, 235, 0.45)';
        ctx.shadowBlur = 14;
        ctx.strokeStyle = '#1D4ED8';
        ctx.lineWidth = 3;
        roundRect(ctx, x - 3, y - 3, w + 6, h + 6, CARD_RADIUS + 2);
        ctx.stroke();
        ctx.restore();
      } else if (isHovered) {
        ctx.save();
        ctx.shadowColor = 'rgba(52, 39, 30, 0.25)';
        ctx.shadowBlur = 10;
        ctx.restore();
      }

      // 4.2 Importance-Based Border Stroke & Style Hierarchy
      let borderStrokeWidth = 1.5;
      let borderStrokeColor = isDimmed ? '#D1D5DB' : theme.border;
      let borderLineDash: number[] = [];
      let importanceGlow = false;

      if (node.held_paise > 0) {
        // Priority 1: Actionable Recovery Target (Held Lien Funds to freeze immediately)
        borderStrokeWidth = (isTarget || isHovered) ? 4.0 : 3.2;
        borderStrokeColor = '#059669'; // Vivid Emerald Green
        borderLineDash = [];
        importanceGlow = true;
      } else if (node.hop === 0) {
        // Priority 2: Victim Origin / Complainant
        borderStrokeWidth = (isTarget || isHovered) ? 3.5 : 2.8;
        borderStrokeColor = '#2563EB'; // Royal Blue
        borderLineDash = [];
      } else if (node.isSupernode) {
        // Priority 3: Syndicate Cluster Ring
        borderStrokeWidth = (isTarget || isHovered) ? 3.0 : 2.5;
        borderStrokeColor = '#0D9488'; // Syndicate Teal
        borderLineDash = [6, 3];
      } else if (node.hop >= 4) {
        // Priority 4: Terminal Cashout Off-Ramp
        borderStrokeWidth = (isTarget || isHovered) ? 3.0 : 2.4;
        borderStrokeColor = '#DC2626'; // Alert Crimson
        borderLineDash = [4, 2];
      } else if ((node.taint_in_paise || 0) >= 25000000) {
        // Priority 5: High-Value Collector Funnel (>= ₹2.5L)
        borderStrokeWidth = (isTarget || isHovered) ? 2.8 : 2.2;
        borderStrokeColor = '#D97706'; // Amber
        borderLineDash = [];
      } else {
        // Priority 6: Standard Intermediary Mule
        borderStrokeWidth = (isTarget || isHovered) ? 2.0 : 1.2;
        borderStrokeColor = isDimmed ? '#D1D5DB' : '#94A3B8';
        borderLineDash = [];
      }

      // 4.2 Card Body Background with Importance Border Stroke
      ctx.save();
      if (importanceGlow && !isDimmed) {
        ctx.shadowColor = 'rgba(5, 150, 105, 0.35)';
        ctx.shadowBlur = 8;
      }
      roundRect(ctx, x, y, w, h, CARD_RADIUS);
      ctx.fillStyle = isDimmed ? '#F3F4F6' : theme.bodyBg;
      ctx.fill();
      ctx.strokeStyle = borderStrokeColor;
      ctx.lineWidth = borderStrokeWidth;
      if (borderLineDash.length > 0) ctx.setLineDash(borderLineDash);
      ctx.stroke();
      ctx.restore();

      // 4.3 Card Header Strip (21px high)
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x + CARD_RADIUS, y);
      ctx.lineTo(x + w - CARD_RADIUS, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + CARD_RADIUS);
      ctx.lineTo(x + w, y + 21);
      ctx.lineTo(x, y + 21);
      ctx.lineTo(x, y + CARD_RADIUS);
      ctx.quadraticCurveTo(x, y, x + CARD_RADIUS, y);
      ctx.closePath();
      ctx.fillStyle = isDimmed ? '#9CA3AF' : (node.held_paise > 0 ? '#065F46' : theme.headerBg);
      ctx.fill();
      ctx.restore();

      // Header Left: Bank Identifier Tag
      const bankTag = node.isSupernode ? 'CLUSTER' : (node.bank || 'BANK').slice(0, 5).toUpperCase();
      ctx.font = '700 9px JetBrains Mono, monospace';
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(`[${bankTag}]`, x + 8, y + 11);

      // Header Right: Role Tag or Actionable Lien Alert
      ctx.font = '700 8.5px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      const headerRole = node.held_paise > 0 ? '🔒 LIEN TARGET' : theme.badgeText;
      ctx.fillText(headerRole, x + w - 8, y + 11);

      // 4.4 Card Body: Account Number (Line 1)
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.font = '700 12.5px JetBrains Mono, monospace';
      ctx.fillStyle = isDimmed ? '#9CA3AF' : '#111827';
      const labelText = node.isSupernode ? `${node.bank} Cluster (${node.subNodeCount})` : node.acct_no;
      ctx.fillText(labelText, x + 10, y + 28);

      // 4.5 Line 2: Forensic Intelligence (In/Out Flow Velocity instead of duplicated IFSC)
      const flows = flowStatsMap.get(node.acct_no) || { inCount: 0, outCount: 0 };
      let forensicMetric = '';
      if (node.isSupernode) {
        forensicMetric = `👥 ${node.subNodeCount} Mules Grouped · ${flows.inCount + flows.outCount} Txns`;
      } else if (node.held_paise > 0) {
        forensicMetric = `🎯 Actionable Target (${flows.inCount} Inflows)`;
      } else if (node.hop === 0) {
        forensicMetric = `🚨 Complainant Account · Loss Siphoned`;
      } else if (node.hop >= 4) {
        forensicMetric = `🏧 Terminal Cashout · ${flows.inCount} Deposits`;
      } else {
        forensicMetric = `⚡ ${flows.inCount} In · ${flows.outCount} Out Flows`;
      }
      ctx.font = '600 9px Inter, sans-serif';
      ctx.fillStyle = isDimmed ? '#9CA3AF' : (node.held_paise > 0 ? '#047857' : '#475569');
      ctx.fillText(forensicMetric, x + 10, y + 43);

      // 4.6 Divider
      ctx.beginPath();
      ctx.moveTo(x, y + 55);
      ctx.lineTo(x + w, y + 55);
      ctx.strokeStyle = isDimmed ? '#E5E7EB' : 'rgba(0, 0, 0, 0.08)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // 4.7 Card Footer: Actionable Financial Status & Recovery Badge
      ctx.textBaseline = 'middle';
      if (node.held_paise > 0) {
        ctx.font = '700 9.5px Inter, sans-serif';
        ctx.fillStyle = isDimmed ? '#9CA3AF' : '#059669';
        const heldStr = `₹${(node.held_paise / 100).toLocaleString('en-IN')}`;
        ctx.fillText(`🔒 ${heldStr}`, x + 10, y + 65);

        ctx.font = '700 7.5px Inter, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillStyle = isDimmed ? '#9CA3AF' : '#047857';
        ctx.fillText('100% RECOVERABLE', x + w - 10, y + 65);
        ctx.textAlign = 'left';
      } else if (node.taint_out_paise > 0) {
        ctx.font = '500 8.5px Inter, sans-serif';
        ctx.fillStyle = isDimmed ? '#9CA3AF' : '#6B7280';
        const movedStr = `₹${(node.taint_out_paise / 100).toLocaleString('en-IN')}`;
        ctx.fillText(`💸 ${movedStr}`, x + 10, y + 65);

        ctx.font = '600 7.5px Inter, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillStyle = isDimmed ? '#9CA3AF' : '#94A3B8';
        ctx.fillText('LAYERED', x + w - 10, y + 65);
        ctx.textAlign = 'left';
      } else {
        ctx.font = '500 8.5px Inter, sans-serif';
        ctx.fillStyle = isDimmed ? '#9CA3AF' : '#6B7280';
        const movedStr = `₹${(node.taint_in_paise / 100).toLocaleString('en-IN')}`;
        ctx.fillText(`INFLOW ₹${movedStr}`, x + 10, y + 65);
      }

      // 4.7 Right Edge Expand/Collapse Toggle Button (+ / −)
      const hasKidsToExpand = edges.some(e => e.src_acct === node.acct_no);

      if (hasKidsToExpand && isLargeGraph) {
        const btnRadius = 10;
        const btnX = x + w;
        const btnY = y + h / 2;

        ctx.save();
        ctx.beginPath();
        ctx.arc(btnX, btnY, btnRadius, 0, Math.PI * 2);
        ctx.fillStyle = isExpanded ? '#334155' : '#2563EB';
        ctx.fill();

        ctx.lineWidth = 2;
        ctx.strokeStyle = '#FFFFFF';
        ctx.stroke();

        // Draw + or − sign on right edge
        ctx.font = '700 13px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(isExpanded ? '−' : '+', btnX, btnY);
        ctx.restore();
      }
    });

    ctx.restore();
    ctx.restore();
  }, [osintNodes, osintEdges, nodePositions, pan, zoom, animTime, stageLanes, stageBands, bounds, focusedNodeConnections, edgeViewMode, expandedNodes, childrenMap, selectedNode, hoveredNode, isLargeGraph, edges, nodes]);

  // Click handler: Toggle expansion of children on node click or [+] button click
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = (e.clientX - rect.left - pan.x) / zoom;
    const clickY = (e.clientY - rect.top - pan.y) / zoom;

    for (const node of osintNodes) {
      const pos = nodePositions.get(node.acct_no);
      if (!pos) continue;

      const isInsideCard = clickX >= pos.x && clickX <= pos.x + pos.w && clickY >= pos.y && clickY <= pos.y + pos.h;
      const isNearPlusBtn = Math.hypot(clickX - (pos.x + pos.w), clickY - (pos.y + pos.h / 2)) <= 14;

      if (isInsideCard || isNearPlusBtn) {
        const hasKids = edges.some(edge => edge.src_acct === node.acct_no);

        if (hasKids && isLargeGraph) {
          setExpandedNodes(prev => {
            const next = new Set(prev);
            if (next.has(node.acct_no)) {
              // Collapse: remove node and any descendants
              const toRemove = new Set<string>([node.acct_no]);
              const queue = [node.acct_no];
              while (queue.length > 0) {
                const currAcct = queue.shift()!;
                edges.forEach(edge => {
                  if (edge.src_acct === currAcct && next.has(edge.dst_acct)) {
                    if (!toRemove.has(edge.dst_acct)) {
                      toRemove.add(edge.dst_acct);
                      queue.push(edge.dst_acct);
                    }
                  }
                });
              }
              toRemove.forEach(a => next.delete(a));
            } else {
              // Expand into next vertical layer
              next.add(node.acct_no);
            }
            return next;
          });
        }

        onSelectNode(node);
        return;
      }
    }

    onSelectNode(null);
  };

  // Expand All / Reset to Spine
  const handleExpandAll = () => {
    const all = new Set<string>();
    nodes.forEach(n => all.add(n.acct_no));
    setExpandedNodes(all);
  };

  const handleResetToSpine = () => {
    setExpandedNodes(new Set());
  };

  // Pan Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    if (isDragging) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    } else {
      const mouseX = (e.clientX - rect.left - pan.x) / zoom;
      const mouseY = (e.clientY - rect.top - pan.y) / zoom;

      let found: NodeData | null = null;
      for (const node of osintNodes) {
        const pos = nodePositions.get(node.acct_no);
        if (pos) {
          const isInsideCard = mouseX >= pos.x && mouseX <= pos.x + pos.w && mouseY >= pos.y && mouseY <= pos.y + pos.h;
          const isNearPlusBtn = Math.hypot(mouseX - (pos.x + pos.w), mouseY - (pos.y + pos.h / 2)) <= 14;
          if (isInsideCard || isNearPlusBtn) {
            found = node;
            break;
          }
        }
      }
      setHoveredNode(found);
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  // Native non-passive Wheel & Gesture Event Listeners for Butter-Smooth Trackpad Pinch & Pan (Mac & Windows)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let isGestureActive = false;
    let gestureStartZoom = 1;

    // Safari macOS Trackpad Pinch Gestures
    const handleGestureStart = (e: any) => {
      e.preventDefault();
      isGestureActive = true;
      gestureStartZoom = zoomRef.current;
    };

    const handleGestureChange = (e: any) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const currentZoom = zoomRef.current;
      const currentPan = panRef.current;

      const targetZoom = Math.min(3.8, Math.max(0.2, gestureStartZoom * e.scale));
      const nextZoom = currentZoom + (targetZoom - currentZoom) * 0.25;
      const clampedZoom = Math.min(3.8, Math.max(0.2, nextZoom));

      if (Math.abs(clampedZoom - currentZoom) > 0.0001) {
        const nextPan = {
          x: mouseX - (mouseX - currentPan.x) * (clampedZoom / currentZoom),
          y: mouseY - (mouseY - currentPan.y) * (clampedZoom / currentZoom)
        };
        zoomRef.current = clampedZoom;
        panRef.current = nextPan;
        setZoom(clampedZoom);
        setPan(nextPan);
      }
    };

    const handleGestureEnd = (e: any) => {
      e.preventDefault();
      isGestureActive = false;
    };

    // Cross-Platform Wheel & Trackpad Pinch Handler (Mac, Windows, Linux)
    const handleWheelNative = (e: WheelEvent) => {
      // Prevent browser from zooming entire webpage viewport
      e.preventDefault();
      e.stopPropagation();

      if (isGestureActive) return;

      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const currentZoom = zoomRef.current;
      const currentPan = panRef.current;

      // 1. Trackpad Pinch Gesture (Mac & Windows Precision Touchpads send e.ctrlKey = true)
      if (e.ctrlKey) {
        // Normalize delta across high-DPR Mac and Windows touchpads
        // Clamp per-event delta to eliminate sudden runaway jumps
        const clampedDelta = Math.sign(e.deltaY) * Math.min(25, Math.abs(e.deltaY));
        const pinchSensitivity = 0.003;
        // Bounded per-tick multiplier (0.95 - 1.05) gives natural, comfortable trackpad feel
        const factor = Math.min(1.05, Math.max(0.95, Math.exp(-clampedDelta * pinchSensitivity)));

        const nextZoom = Math.min(3.8, Math.max(0.2, currentZoom * factor));
        if (Math.abs(nextZoom - currentZoom) > 0.0001) {
          const nextPan = {
            x: mouseX - (mouseX - currentPan.x) * (nextZoom / currentZoom),
            y: mouseY - (mouseY - currentPan.y) * (nextZoom / currentZoom)
          };
          zoomRef.current = nextZoom;
          panRef.current = nextPan;
          setZoom(nextZoom);
          setPan(nextPan);
        }
        return;
      }

      // 2. Physical Mouse Scroll Wheel (Notched wheel with deltaMode lines or discrete 40+ integer steps)
      const isMouseWheel = e.deltaMode !== 0 || (Number.isInteger(e.deltaY) && Math.abs(e.deltaY) >= 40 && Math.abs(e.deltaX) === 0);
      if (isMouseWheel) {
        let delta = e.deltaY;
        if (e.deltaMode === 1) delta *= 16;
        else if (e.deltaMode === 2) delta *= 80;

        const clampedDelta = Math.sign(delta) * Math.min(50, Math.abs(delta));
        const wheelSensitivity = 0.0015;
        const factor = Math.min(1.08, Math.max(0.92, Math.exp(-clampedDelta * wheelSensitivity)));

        const nextZoom = Math.min(3.8, Math.max(0.2, currentZoom * factor));
        if (Math.abs(nextZoom - currentZoom) > 0.0001) {
          const nextPan = {
            x: mouseX - (mouseX - currentPan.x) * (nextZoom / currentZoom),
            y: mouseY - (mouseY - currentPan.y) * (nextZoom / currentZoom)
          };
          zoomRef.current = nextZoom;
          panRef.current = nextPan;
          setZoom(nextZoom);
          setPan(nextPan);
        }
        return;
      }

      // 3. Trackpad Two-Finger Pan (Mac & Windows two-finger sliding gesture)
      const nextPan = {
        x: currentPan.x - e.deltaX,
        y: currentPan.y - e.deltaY
      };
      panRef.current = nextPan;
      setPan(nextPan);
    };

    canvas.addEventListener('wheel', handleWheelNative, { passive: false });
    canvas.addEventListener('gesturestart', handleGestureStart as any, { passive: false });
    canvas.addEventListener('gesturechange', handleGestureChange as any, { passive: false });
    canvas.addEventListener('gestureend', handleGestureEnd as any, { passive: false });

    return () => {
      canvas.removeEventListener('wheel', handleWheelNative);
      canvas.removeEventListener('gesturestart', handleGestureStart as any);
      canvas.removeEventListener('gesturechange', handleGestureChange as any);
      canvas.removeEventListener('gestureend', handleGestureEnd as any);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        backgroundColor: '#F4EDE4',
        userSelect: 'none'
      }}
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={handleClick}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          cursor: isDragging ? 'grabbing' : hoveredNode ? 'pointer' : 'grab'
        }}
      />

      {/* Floating Graph HUD Controls */}
      <div style={{
        position: 'absolute',
        top: '12px',
        left: '14px',
        right: '14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        padding: '7px 14px',
        borderRadius: '8px',
        border: '2px solid #D5C7B5',
        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.06)',
        backdropFilter: 'blur(8px)',
        zIndex: 10
      }}>
        {/* Left: Visible Nodes count and Layout Mode Pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '0.78rem', color: '#334155', fontWeight: 600 }}>
            <strong style={{ color: '#2563EB' }}>{osintNodes.length}</strong> of <strong>{nodes.length}</strong> Accounts Visible · <strong>{osintEdges.length}</strong> Flows
          </span>
          <span style={{ color: '#CBD5E1' }}>|</span>
          <span style={{
            fontSize: '0.7rem',
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: '6px',
            backgroundColor: isLargeGraph ? '#EFF6FF' : '#ECFDF5',
            color: isLargeGraph ? '#1D4ED8' : '#047857',
            border: `1px solid ${isLargeGraph ? '#BFDBFE' : '#A7F3D0'}`
          }}>
            {isLargeGraph ? "Vertical Layers (Victim ➔ Cashout Spine)" : "Horizontal Flow (≤25 Nodes)"}
          </span>
        </div>

        {/* Right: Quick Graph Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {isLargeGraph && (
            <button
              onClick={handleResetToSpine}
              title="Collapse to single layer path from victim to cashout"
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: '1.5px solid #D5C7B5',
                backgroundColor: '#FAF7F2',
                color: '#0F172A',
                fontSize: '0.72rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              ⊖ Single Spine
            </button>
          )}
          <button
            onClick={handleExpandAll}
            title="Expand all downstream nodes across all hops"
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              border: '1.5px solid #D5C7B5',
              backgroundColor: '#FAF7F2',
              color: '#0F172A',
              fontSize: '0.72rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            ⊕ Expand All
          </button>
          <button
            onClick={fitToView}
            title="Fit entire graph into view"
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              border: '1.5px solid #D5C7B5',
              backgroundColor: '#FAF7F2',
              color: '#0F172A',
              fontSize: '0.72rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Fit View
          </button>
          <button
            onClick={() => setEdgeViewMode(m => m === 'focused' ? 'all' : 'focused')}
            title="Toggle between focused connection trail vs all links"
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              border: '1.5px solid #D5C7B5',
              backgroundColor: edgeViewMode === 'focused' ? '#EFF6FF' : '#FAF7F2',
              color: edgeViewMode === 'focused' ? '#1D4ED8' : '#0F172A',
              fontSize: '0.72rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            {edgeViewMode === 'focused' ? '🎯 Focused' : '🌐 All Trails'}
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            <button
              onClick={() => setZoom(z => Math.min(3.8, z * 1.25))}
              style={{
                padding: '4px 8px',
                borderRadius: '5px',
                border: '1.5px solid #D5C7B5',
                backgroundColor: '#FAF7F2',
                color: '#0F172A',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              +
            </button>
            <button
              onClick={() => setZoom(z => Math.max(0.2, z / 1.25))}
              style={{
                padding: '4px 8px',
                borderRadius: '5px',
                border: '1.5px solid #D5C7B5',
                backgroundColor: '#FAF7F2',
                color: '#0F172A',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              −
            </button>
          </div>
        </div>
      </div>

      {/* Floating OSINT Forensic Drawer (When a node is selected) */}
      {selectedNode && (
        <div style={{
          position: 'absolute',
          top: '54px',
          right: '14px',
          width: '320px',
          maxHeight: 'calc(100% - 68px)',
          overflowY: 'auto',
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          border: '2px solid #D5C7B5',
          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.1)',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          zIndex: 20
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{
                fontSize: '0.6875rem',
                fontWeight: 700,
                color: '#64748B',
                textTransform: 'uppercase',
                letterSpacing: '0.04em'
              }}>
                OSINT Forensic Entity
              </span>
              <div style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'monospace', color: '#0F172A' }}>
                {selectedNode.acct_no}
              </div>
            </div>
            <button
              onClick={() => onSelectNode(null)}
              style={{
                border: 'none',
                backgroundColor: 'transparent',
                color: '#94A3B8',
                cursor: 'pointer',
                fontSize: '1rem',
                padding: '2px 6px'
              }}
            >
              ✕
            </button>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px',
            padding: '10px',
            backgroundColor: '#FAF7F2',
            borderRadius: '8px',
            border: '1px solid #D5C7B5',
            fontSize: '0.75rem'
          }}>
            <div>
              <span style={{ color: '#64748B' }}>Primary Bank:</span>
              <div style={{ fontWeight: 600, color: '#0F172A' }}>{selectedNode.bank}</div>
            </div>
            <div>
              <span style={{ color: '#64748B' }}>Stage Hop:</span>
              <div style={{ fontWeight: 600, color: '#0F172A' }}>Stage {selectedNode.hop}</div>
            </div>
            <div>
              <span style={{ color: '#64748B' }}>Tainted Inflow:</span>
              <div style={{ fontWeight: 600, color: '#0F172A' }}>
                ₹{(selectedNode.taint_in_paise / 100).toLocaleString('en-IN')}
              </div>
            </div>
            <div>
              <span style={{ color: '#64748B' }}>Recoverable Lien:</span>
              <div style={{ fontWeight: 700, color: selectedNode.held_paise > 0 ? '#16A34A' : '#64748B' }}>
                ₹{(selectedNode.held_paise / 100).toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          {/* TreeSHAP Anomaly Driver */}
          {nodeDetail?.shap_explanation?.top_drivers?.length > 0 && (
            <div style={{
              padding: '8px 10px',
              backgroundColor: '#FAF7F2',
              borderRadius: '8px',
              border: '1px solid #D5C7B5',
              fontSize: '0.6875rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                <span style={{ fontWeight: 700, color: '#0F172A' }}>TreeSHAP Anomaly Driver:</span>
                <span style={{ fontWeight: 700, color: '#D97706', fontFamily: 'monospace' }}>
                  SHAP +{nodeDetail.shap_explanation.top_drivers[0].shap_value}
                </span>
              </div>
              <p style={{ margin: 0, color: '#475569', lineHeight: 1.3 }}>
                {nodeDetail.shap_explanation.top_drivers[0].evidence_text}
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {childrenMap.has(selectedNode.acct_no) && (
              <button
                onClick={() => {
                  setExpandedNodes(prev => {
                    const next = new Set(prev);
                    if (next.has(selectedNode.acct_no)) next.delete(selectedNode.acct_no);
                    else next.add(selectedNode.acct_no);
                    return next;
                  });
                }}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '6px',
                  backgroundColor: '#EFF6FF',
                  border: '1px solid #DBEAFE',
                  color: '#1D4ED8',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {expandedNodes.has(selectedNode.acct_no) ? '⊖ Collapse Children' : '⊕ Expand Children'}
              </button>
            )}

            {onNavigateToLegal && (
              <button
                onClick={() => onNavigateToLegal(selectedNode.acct_no)}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '6px',
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Draft Notice →
              </button>
            )}
          </div>
        </div>
      )}

      {/* Floating Bottom Scale & Help Bar */}
      <div style={{
        position: 'absolute',
        bottom: '16px',
        left: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        padding: '6px 14px',
        borderRadius: '8px',
        border: '1.5px solid #D5C7B5',
        fontSize: '0.75rem',
        color: '#475569',
        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.06)'
      }}>
        <span>💡 <strong>Click [+] on right edge</strong> to expand next layer · <strong>2-finger swipe or drag</strong> to pan · <strong>Pinch trackpad or mouse wheel</strong> to zoom</span>
      </div>
    </div>
  );
};

export default GraphCanvas;
