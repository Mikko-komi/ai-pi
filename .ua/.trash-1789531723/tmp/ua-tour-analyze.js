#!/usr/bin/env node
import fs from "fs";
import path from "path";

function fail(message) {
  process.stderr.write(String(message) + "\n");
  process.exit(1);
}

function loadJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (err) {
    fail(`Failed to read JSON ${filePath}: ${err.message}`);
  }
}

const ENTRY_FILENAMES = new Set([
  "index.ts",
  "index.js",
  "main.ts",
  "main.js",
  "app.ts",
  "app.js",
  "server.ts",
  "server.js",
  "mod.rs",
  "main.go",
  "main.py",
  "main.rs",
  "manage.py",
  "app.py",
  "wsgi.py",
  "asgi.py",
  "run.py",
  "__main__.py",
  "Application.java",
  "Main.java",
  "Program.cs",
  "config.ru",
  "index.php",
  "App.swift",
  "Application.kt",
  "main.cpp",
  "main.c",
]);

function depthOf(filePath) {
  if (!filePath) return Infinity;
  const parts = String(filePath).split("/").filter(Boolean);
  return parts.length;
}

function isDocNode(node) {
  return node && (node.type === "document" || String(node.id || "").startsWith("document:"));
}

function isCodeNode(node) {
  return node && node.type === "file";
}

function main() {
  const inputPath = process.argv[2];
  const outputPath = process.argv[3];
  if (!inputPath || !outputPath) {
    fail("Usage: node ua-tour-analyze.js <input.json> <output.json>");
  }

  const data = loadJson(inputPath);
  const nodes = Array.isArray(data.nodes) ? data.nodes : [];
  const edges = Array.isArray(data.edges) ? data.edges : [];
  const layers = Array.isArray(data.layers) ? data.layers : [];

  if (nodes.length === 0) {
    fail("Input contains no nodes");
  }

  const nodeById = new Map();
  for (const node of nodes) {
    if (node && node.id) nodeById.set(node.id, node);
  }

  const fanIn = new Map();
  const fanOut = new Map();
  for (const id of nodeById.keys()) {
    fanIn.set(id, 0);
    fanOut.set(id, 0);
  }

  const importCallAdj = new Map();
  const undirectedPairs = new Map();
  const directedPairs = new Map();

  function addAdj(map, src, dst) {
    if (!map.has(src)) map.set(src, new Set());
    map.get(src).add(dst);
  }

  function pairKey(a, b) {
    return a < b ? `${a}|${b}` : `${b}|${a}`;
  }

  for (const edge of edges) {
    if (!edge || !edge.source || !edge.target) continue;
    if (!nodeById.has(edge.source) || !nodeById.has(edge.target)) continue;
    if (edge.source === edge.target) continue;

    fanOut.set(edge.source, (fanOut.get(edge.source) || 0) + 1);
    fanIn.set(edge.target, (fanIn.get(edge.target) || 0) + 1);

    const ek = `${edge.source}->${edge.target}:${edge.type || ""}`;
    directedPairs.set(ek, (directedPairs.get(ek) || 0) + 1);

    const uk = pairKey(edge.source, edge.target);
    if (!undirectedPairs.has(uk)) undirectedPairs.set(uk, { a: edge.source, b: edge.target, count: 0, types: new Set() });
    const rec = undirectedPairs.get(uk);
    rec.count += 1;
    rec.types.add(edge.type || "");

    if (edge.type === "imports" || edge.type === "calls") {
      addAdj(importCallAdj, edge.source, edge.target);
    }
  }

  const fanInRanking = [...fanIn.entries()]
    .map(([id, count]) => ({ id, fanIn: count, name: (nodeById.get(id) || {}).name || id }))
    .sort((a, b) => b.fanIn - a.fanIn || a.id.localeCompare(b.id))
    .slice(0, 20);

  const fanOutRanking = [...fanOut.entries()]
    .map(([id, count]) => ({ id, fanOut: count, name: (nodeById.get(id) || {}).name || id }))
    .sort((a, b) => b.fanOut - a.fanOut || a.id.localeCompare(b.id))
    .slice(0, 20);

  const allFanOuts = [...fanOut.values()].sort((a, b) => a - b);
  const allFanIns = [...fanIn.values()].sort((a, b) => a - b);
  const fanOutThreshold = allFanOuts[Math.max(0, Math.ceil(allFanOuts.length * 0.9) - 1)] || 0;
  const fanInCutoffIndex = Math.max(0, Math.floor(allFanIns.length * 0.25) - 1);
  const fanInLowThreshold = allFanIns[fanInCutoffIndex] || 0;

  const scored = [];
  for (const node of nodes) {
    if (!node || !node.id) continue;
    let score = 0;
    const name = node.name || "";
    const filePath = node.filePath || "";
    const type = node.type || "";

    if (type === "file" || type === "document") {
      if (type === "file") {
        if (ENTRY_FILENAMES.has(name)) score += 3;
        const depth = depthOf(filePath);
        if (depth <= 2) score += 1;
        if ((fanOut.get(node.id) || 0) >= fanOutThreshold && fanOutThreshold > 0) score += 1;
        if ((fanIn.get(node.id) || 0) <= fanInLowThreshold) score += 1;
      }
      if (type === "document") {
        const base = path.posix.basename(filePath || name);
        const dir = path.posix.dirname(filePath || "");
        if ((base === "README.md" || name === "README.md") && (dir === "." || dir === "" || filePath === "README.md")) {
          score += 5;
        } else if ((filePath || "").endsWith(".md") && (dir === "." || dir === "")) {
          score += 2;
        }
      }
    }

    if (score > 0) {
      scored.push({
        id: node.id,
        score,
        name: node.name || node.id,
        summary: node.summary || "",
      });
    }
  }

  scored.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  const entryPointCandidates = scored.slice(0, 5);

  let startNode = null;
  for (const cand of scored) {
    const node = nodeById.get(cand.id);
    if (node && !isDocNode(node) && isCodeNode(node)) {
      startNode = cand.id;
      break;
    }
  }
  if (!startNode) {
    for (const node of nodes) {
      if (isCodeNode(node)) {
        startNode = node.id;
        break;
      }
    }
  }

  const order = [];
  const depthMap = {};
  const byDepth = {};
  if (startNode && nodeById.has(startNode)) {
    const visited = new Set([startNode]);
    const queue = [[startNode, 0]];
    while (queue.length > 0) {
      const [current, depth] = queue.shift();
      order.push(current);
      depthMap[current] = depth;
      const key = String(depth);
      if (!byDepth[key]) byDepth[key] = [];
      byDepth[key].push(current);
      const neighbors = importCallAdj.get(current);
      if (!neighbors) continue;
      const next = [...neighbors].sort();
      for (const dest of next) {
        if (visited.has(dest)) continue;
        if (!nodeById.has(dest)) continue;
        visited.add(dest);
        queue.push([dest, depth + 1]);
      }
    }
  }

  const documentation = [];
  const infrastructure = [];
  const dataFiles = [];
  const config = [];
  for (const node of nodes) {
    if (!node || !node.id) continue;
    const item = {
      id: node.id,
      name: node.name || node.id,
      type: node.type,
      summary: node.summary || "",
    };
    if (node.type === "document") documentation.push(item);
    else if (node.type === "service" || node.type === "pipeline" || node.type === "resource") infrastructure.push(item);
    else if (node.type === "table" || node.type === "schema" || node.type === "endpoint") dataFiles.push(item);
    else if (node.type === "config") config.push(item);
  }

  const bidir = new Map();
  for (const edge of edges) {
    if (!edge || !edge.source || !edge.target) continue;
    if (edge.source === edge.target) continue;
    if (edge.type !== "imports" && edge.type !== "calls") continue;
    const reverse = `${edge.target}->${edge.source}:${edge.type}`;
    const forward = `${edge.source}->${edge.target}:${edge.type}`;
    if (directedPairs.has(reverse) && directedPairs.has(forward)) {
      const key = pairKey(edge.source, edge.target);
      if (!bidir.has(key)) bidir.set(key, { a: edge.source, b: edge.target });
    }
  }

  const parent = new Map();
  function find(x) {
    if (!parent.has(x)) parent.set(x, x);
    if (parent.get(x) !== x) parent.set(x, find(parent.get(x)));
    return parent.get(x);
  }
  function union(a, b) {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  }
  for (const { a, b } of bidir.values()) union(a, b);

  const groups = new Map();
  for (const id of parent.keys()) {
    const root = find(id);
    if (!groups.has(root)) groups.set(root, new Set());
    groups.get(root).add(id);
  }

  const neighborCounts = new Map();
  for (const rec of undirectedPairs.values()) {
    if (!neighborCounts.has(rec.a)) neighborCounts.set(rec.a, new Set());
    if (!neighborCounts.has(rec.b)) neighborCounts.set(rec.b, new Set());
    neighborCounts.get(rec.a).add(rec.b);
    neighborCounts.get(rec.b).add(rec.a);
  }

  const clusters = [];
  for (const members of groups.values()) {
    const cluster = new Set(members);
    let expanded = true;
    while (expanded && cluster.size < 5) {
      expanded = false;
      const candidates = [];
      for (const [nid, neigh] of neighborCounts.entries()) {
        if (cluster.has(nid)) continue;
        let hits = 0;
        for (const m of cluster) {
          if (neigh.has(m)) hits += 1;
        }
        if (hits >= 2) candidates.push({ nid, hits });
      }
      candidates.sort((a, b) => b.hits - a.hits || a.nid.localeCompare(b.nid));
      if (candidates.length > 0 && cluster.size < 5) {
        cluster.add(candidates[0].nid);
        expanded = true;
      }
    }
    if (cluster.size < 2 || cluster.size > 5) continue;
    let edgeCount = 0;
    const arr = [...cluster];
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        const rec = undirectedPairs.get(pairKey(arr[i], arr[j]));
        if (rec) edgeCount += rec.count;
      }
    }
    clusters.push({ nodes: arr.sort(), edgeCount });
  }
  clusters.sort((a, b) => b.edgeCount - a.edgeCount || a.nodes.length - b.nodes.length);
  const topClusters = clusters.slice(0, 10);

  const nodeSummaryIndex = {};
  for (const node of nodes) {
    if (!node || !node.id) continue;
    nodeSummaryIndex[node.id] = {
      name: node.name || node.id,
      type: node.type || "unknown",
      summary: node.summary || "",
    };
  }

  const result = {
    scriptCompleted: true,
    entryPointCandidates,
    fanInRanking,
    fanOutRanking,
    bfsTraversal: {
      startNode,
      order,
      depthMap,
      byDepth,
    },
    nonCodeFiles: {
      documentation,
      infrastructure,
      data: dataFiles,
      config,
    },
    clusters: topClusters,
    layers: {
      count: layers.length,
      list: layers.map((layer) => ({
        id: layer.id,
        name: layer.name,
        description: layer.description || "",
      })),
    },
    nodeSummaryIndex,
    totalNodes: nodes.length,
    totalEdges: edges.length,
  };

  try {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  } catch (err) {
    fail(`Failed to write output: ${err.message}`);
  }
}

main();
