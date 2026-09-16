#!/usr/bin/env node
import fs from "fs";
import path from "path";

function fail(msg) {
  process.stderr.write(String(msg) + "\n");
  process.exit(1);
}

function commonPrefix(paths) {
  if (paths.length === 0) return "";
  const split = paths.map((p) => p.split("/").filter(Boolean));
  const minLen = Math.min(...split.map((s) => s.length));
  const prefix = [];
  for (let i = 0; i < minLen; i++) {
    const seg = split[0][i];
    if (split.every((s) => s[i] === seg)) prefix.push(seg);
    else break;
  }
  if (prefix.length === 0) return "";
  if (prefix.length === split[0].length && split.every((s) => s.length === prefix.length)) {
    return prefix.slice(0, -1).join("/");
  }
  return prefix.join("/");
}

function firstSegmentAfterPrefix(filePath, prefix) {
  const norm = filePath.replace(/\\/g, "/");
  let rest = norm;
  if (prefix) {
    const p = prefix.endsWith("/") ? prefix : prefix + "/";
    if (norm.startsWith(p)) rest = norm.slice(p.length);
    else if (norm === prefix) rest = "";
  }
  const segs = rest.split("/").filter(Boolean);
  if (segs.length <= 1) return "root";
  return segs[0];
}

const DIR_PATTERNS = [
  { re: /^(routes|api|controllers|endpoints|handlers|routers|blueprints|serializers|controller)$/i, label: "api" },
  { re: /^(services|core|lib|domain|logic|internal|signals|mailers|jobs|channels|composables)$/i, label: "service" },
  { re: /^(models|db|data|persistence|repository|entities|migrations|entity|sql|database|schema)$/i, label: "data" },
  { re: /^(components|views|pages|ui|layouts|screens)$/i, label: "ui" },
  { re: /^(middleware|plugins|interceptors|guards)$/i, label: "middleware" },
  { re: /^(utils|helpers|common|shared|tools|templatetags|pkg)$/i, label: "utility" },
  { re: /^(config|constants|env|settings|management|commands)$/i, label: "config" },
  { re: /^(__tests__|test|tests|spec|specs)$/i, label: "test" },
  { re: /^(types|interfaces|schemas|contracts|dtos|dto|request|response)$/i, label: "types" },
  { re: /^hooks$/i, label: "hooks" },
  { re: /^(store|state|reducers|actions|slices)$/i, label: "state" },
  { re: /^(assets|static|public)$/i, label: "assets" },
  { re: /^cmd$/i, label: "entry" },
  { re: /^bin$/i, label: "entry" },
  { re: /^(docs|documentation|wiki)$/i, label: "documentation" },
  { re: /^(deploy|deployment|infra|infrastructure|k8s|kubernetes|helm|charts|terraform|tf|docker)$/i, label: "infrastructure" },
  { re: /^(\.github|\.gitlab|\.circleci)$/i, label: "ci-cd" },
];

function matchDirPattern(name) {
  for (const { re, label } of DIR_PATTERNS) {
    if (re.test(name)) return label;
  }
  return null;
}

function matchFilePattern(filePath, fileName) {
  const base = fileName || path.basename(filePath);
  const lower = filePath.toLowerCase();
  if (
    /\.(test|spec)\.[^.]+$/.test(base) ||
    /^test_.*\.py$/.test(base) ||
    /_test\.go$/.test(base) ||
    /Test\.java$/.test(base) ||
    /_spec\.rb$/.test(base) ||
    /Test\.php$/.test(base) ||
    /Tests\.cs$/.test(base)
  ) {
    return "test";
  }
  if (/\.d\.ts$/.test(base)) return "types";
  if (base === "index.ts" || base === "index.js" || base === "__init__.py") return "entry";
  if (base === "manage.py" && !filePath.includes("/")) return "entry";
  if (base === "wsgi.py" || base === "asgi.py") return "config";
  if (base === "main.go" && /(?:^|\/)cmd\//.test(filePath)) return "entry";
  if ((base === "main.rs" || base === "lib.rs") && /(?:^|\/)src\//.test(filePath)) return "entry";
  if (base === "Application.java" || base === "Program.cs") return "entry";
  if (base === "config.ru") return "entry";
  if (
    ["Cargo.toml", "go.mod", "Gemfile", "pom.xml", "build.gradle", "composer.json"].includes(base)
  ) {
    return "config";
  }
  if (base === "Dockerfile" || /^docker-compose\./i.test(base)) return "infrastructure";
  if (/\.tf$/.test(base) || /\.tfvars$/.test(base)) return "infrastructure";
  if (lower.includes(".github/workflows/") || base === ".gitlab-ci.yml" || base === "Jenkinsfile") {
    return "ci-cd";
  }
  if (/\.sql$/.test(base)) return "data";
  if (/\.(graphql|gql|proto)$/.test(base)) return "types";
  if (/\.(md|rst)$/.test(base)) return "documentation";
  if (base === "Makefile") return "infrastructure";
  return null;
}

function isInfraPath(fp) {
  const lower = fp.toLowerCase();
  const base = path.basename(fp);
  return (
    base === "Dockerfile" ||
    /^docker-compose/i.test(base) ||
    /\.tf$/.test(base) ||
    /\.tfvars$/.test(base) ||
    lower.includes("/k8s/") ||
    lower.includes("/kubernetes/") ||
    lower.includes("/helm/") ||
    lower.includes("/terraform/") ||
    lower.includes("/infra/") ||
    lower.includes("/deploy/")
  );
}

function isCiPath(fp) {
  const lower = fp.toLowerCase();
  const base = path.basename(fp);
  return (
    lower.includes(".github/workflows/") ||
    lower.includes(".github/") ||
    base === ".gitlab-ci.yml" ||
    base === "Jenkinsfile" ||
    lower.includes(".circleci/")
  );
}

function isSchemaPath(fp) {
  return /\.(sql|graphql|gql|proto|prisma)$/i.test(fp);
}

function isMigrationPath(fp) {
  return /migrat/i.test(fp) && (/\.sql$/i.test(fp) || /migrat/i.test(fp));
}

function isModelPath(fp) {
  return /(^|\/)(models|entities|entity)(\/|$)/i.test(fp);
}

function isApiHandlerPath(fp) {
  return /(^|\/)(routes|api|controllers|endpoints|handlers|routers)(\/|$)/i.test(fp);
}

function main() {
  const inPath = process.argv[2];
  const outPath = process.argv[3];
  if (!inPath || !outPath) fail("Usage: ua-arch-analyze.js <input.json> <output.json>");

  let raw;
  try {
    raw = fs.readFileSync(inPath, "utf8");
  } catch (e) {
    fail("Failed to read input: " + e.message);
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    fail("Invalid JSON input: " + e.message);
  }

  const fileNodes = Array.isArray(data.fileNodes) ? data.fileNodes : [];
  const importEdges = Array.isArray(data.importEdges) ? data.importEdges : [];
  const allEdges = Array.isArray(data.allEdges) ? data.allEdges : [];

  if (fileNodes.length === 0) fail("No fileNodes in input");

  const paths = fileNodes.map((n) => (n.filePath || "").replace(/\\/g, "/"));
  const prefix = commonPrefix(paths.filter(Boolean));

  const directoryGroups = {};
  const nodeById = new Map();
  for (const n of fileNodes) {
    nodeById.set(n.id, n);
    const fp = (n.filePath || "").replace(/\\/g, "/");
    const group = firstSegmentAfterPrefix(fp, prefix);
    if (!directoryGroups[group]) directoryGroups[group] = [];
    directoryGroups[group].push(n.id);
  }

  const nodeTypeGroups = {};
  for (const n of fileNodes) {
    const t = n.type || "file";
    if (!nodeTypeGroups[t]) nodeTypeGroups[t] = [];
    nodeTypeGroups[t].push(n.id);
  }

  const fileFanOut = {};
  const fileFanIn = {};
  const adj = new Map();
  for (const n of fileNodes) {
    fileFanOut[n.id] = 0;
    fileFanIn[n.id] = 0;
    adj.set(n.id, new Set());
  }
  for (const e of importEdges) {
    if (!nodeById.has(e.source) || !nodeById.has(e.target)) continue;
    fileFanOut[e.source] = (fileFanOut[e.source] || 0) + 1;
    fileFanIn[e.target] = (fileFanIn[e.target] || 0) + 1;
    adj.get(e.source).add(e.target);
  }

  const idToGroup = new Map();
  for (const [g, ids] of Object.entries(directoryGroups)) {
    for (const id of ids) idToGroup.set(id, g);
  }

  const interMap = new Map();
  const intraInternal = {};
  const intraTotal = {};
  for (const g of Object.keys(directoryGroups)) {
    intraInternal[g] = 0;
    intraTotal[g] = 0;
  }

  for (const e of importEdges) {
    const from = idToGroup.get(e.source);
    const to = idToGroup.get(e.target);
    if (!from || !to) continue;
    intraTotal[from] = (intraTotal[from] || 0) + 1;
    if (from !== to) intraTotal[to] = (intraTotal[to] || 0) + 1;
    if (from === to) {
      intraInternal[from] = (intraInternal[from] || 0) + 1;
    } else {
      const key = from + "\0" + to;
      interMap.set(key, (interMap.get(key) || 0) + 1);
    }
  }

  const interGroupImports = [];
  for (const [key, count] of interMap.entries()) {
    const [from, to] = key.split("\0");
    interGroupImports.push({ from, to, count });
  }
  interGroupImports.sort((a, b) => b.count - a.count);

  const intraGroupDensity = {};
  for (const g of Object.keys(directoryGroups)) {
    const total = intraTotal[g] || 0;
    const internal = intraInternal[g] || 0;
    intraGroupDensity[g] = {
      internalEdges: internal,
      totalEdges: total,
      density: total === 0 ? 0 : Number((internal / total).toFixed(4)),
    };
  }

  const crossMap = new Map();
  for (const e of allEdges) {
    const src = nodeById.get(e.source);
    const tgt = nodeById.get(e.target);
    if (!src || !tgt) continue;
    const key = [src.type || "file", tgt.type || "file", e.type || "unknown"].join("\0");
    crossMap.set(key, (crossMap.get(key) || 0) + 1);
  }
  const crossCategoryEdges = [];
  for (const [key, count] of crossMap.entries()) {
    const [fromType, toType, edgeType] = key.split("\0");
    crossCategoryEdges.push({ fromType, toType, edgeType, count });
  }
  crossCategoryEdges.sort((a, b) => b.count - a.count);

  const patternMatches = {};
  for (const [g, ids] of Object.entries(directoryGroups)) {
    const dirLabel = matchDirPattern(g);
    if (dirLabel) {
      patternMatches[g] = dirLabel;
      continue;
    }
    const labels = {};
    for (const id of ids) {
      const n = nodeById.get(id);
      const fp = n.filePath || "";
      const fileLabel = matchFilePattern(fp, n.name);
      const label = fileLabel || n.type || "file";
      labels[label] = (labels[label] || 0) + 1;
    }
    let best = null;
    let bestCount = 0;
    for (const [lab, c] of Object.entries(labels)) {
      if (c > bestCount) {
        best = lab;
        bestCount = c;
      }
    }
    if (best) patternMatches[g] = best;
  }

  const infraFiles = [];
  let hasDockerfile = false;
  let hasCompose = false;
  let hasK8s = false;
  let hasTerraform = false;
  let hasCI = false;
  for (const n of fileNodes) {
    const fp = n.filePath || "";
    const base = path.basename(fp);
    if (base === "Dockerfile" || /dockerfile/i.test(base)) {
      hasDockerfile = true;
      infraFiles.push(fp);
    }
    if (/^docker-compose/i.test(base)) {
      hasCompose = true;
      infraFiles.push(fp);
    }
    if (/(^|\/)(k8s|kubernetes|helm|charts)(\/|$)/i.test(fp)) {
      hasK8s = true;
      infraFiles.push(fp);
    }
    if (/\.tf$/.test(fp) || /\.tfvars$/.test(fp) || /(^|\/)terraform(\/|$)/i.test(fp)) {
      hasTerraform = true;
      infraFiles.push(fp);
    }
    if (isCiPath(fp) || n.type === "pipeline") {
      hasCI = true;
      infraFiles.push(fp);
    }
    if (isInfraPath(fp) && !infraFiles.includes(fp)) infraFiles.push(fp);
  }

  const schemaFiles = [];
  const migrationFiles = [];
  const dataModelFiles = [];
  const apiHandlerFiles = [];
  for (const n of fileNodes) {
    const fp = n.filePath || "";
    if (isSchemaPath(fp) || n.type === "schema" || n.type === "table") schemaFiles.push(fp);
    if (isMigrationPath(fp)) migrationFiles.push(fp);
    if (isModelPath(fp)) dataModelFiles.push(fp);
    if (isApiHandlerPath(fp)) apiHandlerFiles.push(fp);
  }

  const groupsWithDocsSet = new Set();
  const undocumentedGroups = [];
  for (const [g, ids] of Object.entries(directoryGroups)) {
    let hasDoc = false;
    for (const id of ids) {
      const n = nodeById.get(id);
      const fp = n.filePath || "";
      const base = path.basename(fp);
      if (n.type === "document" || /\.(md|rst)$/i.test(fp) || /^readme/i.test(base)) {
        hasDoc = true;
        break;
      }
    }
    if (hasDoc) groupsWithDocsSet.add(g);
    else undocumentedGroups.push(g);
  }
  const totalGroups = Object.keys(directoryGroups).length;
  const groupsWithDocs = groupsWithDocsSet.size;
  const docCoverage = {
    groupsWithDocs,
    totalGroups,
    coverageRatio: totalGroups === 0 ? 0 : Number((groupsWithDocs / totalGroups).toFixed(4)),
    undocumentedGroups,
  };

  const pairCounts = new Map();
  for (const { from, to, count } of interGroupImports) {
    const a = from < to ? from : to;
    const b = from < to ? to : from;
    const key = a + "\0" + b;
    if (!pairCounts.has(key)) pairCounts.set(key, { a, b, ab: 0, ba: 0 });
    const rec = pairCounts.get(key);
    if (from === a) rec.ab += count;
    else rec.ba += count;
  }
  const dependencyDirection = [];
  for (const rec of pairCounts.values()) {
    if (rec.ab > rec.ba) dependencyDirection.push({ dependent: rec.a, dependsOn: rec.b });
    else if (rec.ba > rec.ab) dependencyDirection.push({ dependent: rec.b, dependsOn: rec.a });
  }

  const packageGroups = {};
  for (const n of fileNodes) {
    const fp = (n.filePath || "").replace(/\\/g, "/");
    let key = "root";
    if (fp.startsWith("packages/")) {
      const pkg = fp.split("/")[1] || "packages";
      key = "packages/" + pkg;
    } else if (fp.startsWith(".github/") || fp === ".github") {
      key = ".github";
    } else {
      key = "root";
    }
    if (!packageGroups[key]) packageGroups[key] = [];
    packageGroups[key].push(n.id);
  }

  const filesPerGroup = {};
  for (const [g, ids] of Object.entries(directoryGroups)) filesPerGroup[g] = ids.length;
  const nodeTypeCounts = {};
  for (const [t, ids] of Object.entries(nodeTypeGroups)) nodeTypeCounts[t] = ids.length;
  const filesPerPackage = {};
  for (const [g, ids] of Object.entries(packageGroups)) filesPerPackage[g] = ids.length;

  const idToPkg = new Map();
  for (const [g, ids] of Object.entries(packageGroups)) {
    for (const id of ids) idToPkg.set(id, g);
  }
  const pkgInterMap = new Map();
  for (const e of importEdges) {
    const from = idToPkg.get(e.source);
    const to = idToPkg.get(e.target);
    if (!from || !to || from === to) continue;
    const key = from + "\0" + to;
    pkgInterMap.set(key, (pkgInterMap.get(key) || 0) + 1);
  }
  const interPackageImports = [];
  for (const [key, count] of pkgInterMap.entries()) {
    const [from, to] = key.split("\0");
    interPackageImports.push({ from, to, count });
  }
  interPackageImports.sort((a, b) => b.count - a.count);

  const result = {
    scriptCompleted: true,
    prefix,
    directoryGroups,
    nodeTypeGroups,
    crossCategoryEdges,
    interGroupImports,
    intraGroupDensity,
    patternMatches,
    deploymentTopology: {
      hasDockerfile,
      hasCompose,
      hasK8s,
      hasTerraform,
      hasCI,
      infraFiles: [...new Set(infraFiles)],
    },
    dataPipeline: {
      schemaFiles,
      migrationFiles,
      dataModelFiles,
      apiHandlerFiles,
    },
    docCoverage,
    dependencyDirection,
    packageGroups,
    interPackageImports,
    fileStats: {
      totalFileNodes: fileNodes.length,
      filesPerGroup,
      filesPerPackage,
      nodeTypeCounts,
    },
    fileFanIn,
    fileFanOut,
  };

  try {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
  } catch (e) {
    fail("Failed to write output: " + e.message);
  }
}

try {
  main();
} catch (e) {
  fail(e.stack || e.message);
}
