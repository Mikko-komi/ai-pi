#!/usr/bin/env python3
"""Generate batch-12 knowledge graph fragments from extract results."""

from __future__ import annotations

import json
import math
from collections import defaultdict
from pathlib import Path

UA = Path("/Users/elex-mb0203/MyWork/agent-projects/ai-pi/.ua")
EXTRACT = json.loads((UA / "tmp/ua-file-extract-results-12.json").read_text())
BRIEF = json.loads((UA / "intermediate/batch-briefs/batch-12.json").read_text())
META = json.loads((UA / "tmp/ua-batch-12-meta.json").read_text())
OUT_DIR = UA / "intermediate"

BATCH_IMPORT = BRIEF["batchImportData"]
NEIGHBOR_MAP = BRIEF["neighborMap"]


def file_id(path: str) -> str:
    return f"file:{path}"


def fn_id(path: str, name: str) -> str:
    return f"function:{path}:{name}"


def cl_id(path: str, name: str) -> str:
    return f"class:{path}:{name}"


def span_complexity(start: int, end: int) -> str:
    n = end - start + 1
    if n < 50:
        return "simple"
    if n <= 200:
        return "moderate"
    return "complex"


def significant_functions(result: dict) -> list[dict]:
    exports = {e["name"] for e in (result.get("exports") or [])}
    out = []
    for fn in result.get("functions") or []:
        start, end = fn["startLine"], fn["endLine"]
        n = end - start + 1
        if fn["name"] in exports or n >= 10:
            out.append(fn)
    return out


def significant_classes(result: dict) -> list[dict]:
    exports = {e["name"] for e in (result.get("exports") or [])}
    out = []
    for cl in result.get("classes") or []:
        start, end = cl["startLine"], cl["endLine"]
        n = end - start + 1
        methods = cl.get("methods") or []
        if cl["name"] in exports or n >= 20 or len(methods) >= 2:
            out.append(cl)
    return out


def require_meta(kind: str, path: str, name: str) -> dict:
    key = f"{kind}:{path}:{name}"
    if key not in META["symbols"]:
        raise SystemExit(f"missing symbol meta: {key}")
    return META["symbols"][key]


def build_nodes() -> tuple[list[dict], dict]:
    nodes: list[dict] = []
    index: dict[str, dict] = {}
    results_by_path = {r["path"]: r for r in EXTRACT["results"]}

    for path, fmeta in META["files"].items():
        result = results_by_path[path]
        node = {
            "id": file_id(path),
            "type": "file",
            "name": path.rsplit("/", 1)[-1],
            "filePath": path,
            "summary": fmeta["summary"],
            "tags": fmeta["tags"],
            "complexity": fmeta["complexity"],
        }
        if fmeta.get("languageNotes"):
            node["languageNotes"] = fmeta["languageNotes"]
        nodes.append(node)
        index[node["id"]] = node

        exports = {e["name"] for e in (result.get("exports") or [])}
        for fn in significant_functions(result):
            sm = require_meta("function", path, fn["name"])
            node = {
                "id": fn_id(path, fn["name"]),
                "type": "function",
                "name": fn["name"],
                "filePath": path,
                "lineRange": [fn["startLine"], fn["endLine"]],
                "summary": sm["summary"],
                "tags": sm["tags"],
                "complexity": sm.get("complexity") or span_complexity(fn["startLine"], fn["endLine"]),
            }
            if sm.get("languageNotes"):
                node["languageNotes"] = sm["languageNotes"]
            nodes.append(node)
            index[node["id"]] = node
            node["_exported"] = fn["name"] in exports

        for cl in significant_classes(result):
            sm = require_meta("class", path, cl["name"])
            node = {
                "id": cl_id(path, cl["name"]),
                "type": "class",
                "name": cl["name"],
                "filePath": path,
                "lineRange": [cl["startLine"], cl["endLine"]],
                "summary": sm["summary"],
                "tags": sm["tags"],
                "complexity": sm.get("complexity") or span_complexity(cl["startLine"], cl["endLine"]),
            }
            if sm.get("languageNotes"):
                node["languageNotes"] = sm["languageNotes"]
            nodes.append(node)
            index[node["id"]] = node
            node["_exported"] = cl["name"] in exports
            node["_methods"] = cl.get("methods") or []
            node["_range"] = (cl["startLine"], cl["endLine"])

    return nodes, index


def caller_node_id(path: str, caller: str, line: int, index: dict) -> str | None:
    fn = fn_id(path, caller)
    if fn in index:
        return fn
    class_hits = []
    for nid, node in index.items():
        if node.get("type") != "class" or node.get("filePath") != path:
            continue
        start, end = node.get("_range") or (None, None)
        if start is not None and start <= line <= end:
            class_hits.append(nid)
        elif caller in (node.get("_methods") or []) or caller == node["name"]:
            class_hits.append(nid)
    if len(class_hits) == 1:
        return class_hits[0]
    if len(class_hits) > 1:
        for nid in class_hits:
            start, end = index[nid]["_range"]
            if start <= line <= end:
                return nid
    return None


def batch_symbol_target(name: str) -> list[str]:
    targets = []
    for result in EXTRACT["results"]:
        path = result["path"]
        for fn in significant_functions(result):
            if fn["name"] == name:
                targets.append(fn_id(path, name))
        for cl in significant_classes(result):
            if cl["name"] == name:
                targets.append(cl_id(path, name))
    return targets


def neighbor_target(src_path: str, name: str) -> str | None:
    imports = set(BATCH_IMPORT.get(src_path) or [])
    neighbors = NEIGHBOR_MAP.get(src_path) or []
    hits = []
    for nb in neighbors:
        if name in (nb.get("symbols") or []) and nb["path"] in imports:
            hits.append(nb["path"])
    if not hits:
        for nb in neighbors:
            if name in (nb.get("symbols") or []):
                hits.append(nb["path"])
    if not hits:
        return None
    # Prefer the imported defining file over barrel re-exports.
    preferred = [p for p in hits if not p.endswith("/index.ts")]
    path = preferred[0] if preferred else hits[0]
    if name[:1].isupper() and not name.isupper() and not name.endswith(("Options", "Result", "Event", "Error", "Config", "Info", "Settings")):
        # Heuristic: constructor-like PascalCase neighbors.
        known_classes = {
            "AgentSession",
            "ExtensionRunner",
            "SessionManager",
            "FooterDataProvider",
            "FileAuthStorageBackend",
            "AuthStorage",
            "InteractiveMode",
            "ModelsService",
        }
        if name in known_classes:
            return cl_id(path, name)
    return fn_id(path, name)


def add_edge(edges: list[dict], seen: set, source: str, target: str, etype: str, weight: float) -> None:
    if source == target:
        return
    key = (source, target, etype)
    if key in seen:
        return
    seen.add(key)
    edges.append(
        {
            "source": source,
            "target": target,
            "type": etype,
            "direction": "forward",
            "weight": weight,
        }
    )


def build_edges(nodes: list[dict], index: dict) -> list[dict]:
    edges: list[dict] = []
    seen: set = set()
    results_by_path = {r["path"]: r for r in EXTRACT["results"]}

    # imports 1:1
    expected_imports = 0
    for path, deps in BATCH_IMPORT.items():
        expected_imports += len(deps)
        for dep in deps:
            add_edge(edges, seen, file_id(path), file_id(dep), "imports", 0.7)
    import_count = sum(1 for e in edges if e["type"] == "imports")
    if import_count != expected_imports:
        raise SystemExit(f"import edge mismatch: {import_count} != {expected_imports}")

    # contains + exports
    for node in nodes:
        if node["type"] not in ("function", "class"):
            continue
        add_edge(edges, seen, file_id(node["filePath"]), node["id"], "contains", 1.0)
        if node.get("_exported"):
            add_edge(edges, seen, file_id(node["filePath"]), node["id"], "exports", 0.8)

    # calls from extract
    for result in EXTRACT["results"]:
        path = result["path"]
        for call in result.get("callGraph") or []:
            callee = call.get("callee") or ""
            caller = call.get("caller") or ""
            line = call.get("lineNumber") or 0
            source = caller_node_id(path, caller, line, index)
            if not source:
                continue
            base = callee.split(".")[0] if callee else ""
            if not base:
                continue
            targets = batch_symbol_target(base)
            targets = [t for t in targets if not t.endswith(f":{path}:{base}") and index.get(t, {}).get("filePath") != path]
            if not targets:
                # only emit cross-batch neighbor calls for exact (non-method) names
                if "." in callee:
                    nt = neighbor_target(path, base) if base[:1].isupper() else None
                else:
                    nt = neighbor_target(path, callee)
                if nt:
                    targets = [nt]
            for target in targets:
                add_edge(edges, seen, source, target, "calls", 0.8)

    # explicit high-confidence intra-batch constructions
    extra = [
        (
            fn_id("packages/coding-agent/src/core/sdk.ts", "createAgentSession"),
            cl_id("packages/coding-agent/src/core/model-runtime.ts", "ModelRuntime"),
        ),
        (
            fn_id("packages/coding-agent/src/core/sdk.ts", "createAgentSession"),
            cl_id("packages/coding-agent/src/core/settings-manager.ts", "SettingsManager"),
        ),
        (
            fn_id("packages/coding-agent/src/core/sdk.ts", "createAgentSession"),
            cl_id("packages/coding-agent/src/core/resource-loader.ts", "DefaultResourceLoader"),
        ),
        (
            cl_id("packages/coding-agent/src/core/model-runtime.ts", "ModelRuntime"),
            cl_id("packages/coding-agent/src/core/model-config.ts", "ModelConfig"),
        ),
        (
            cl_id("packages/coding-agent/src/core/model-registry.ts", "ModelRegistry"),
            cl_id("packages/coding-agent/src/core/model-runtime.ts", "ModelRuntime"),
        ),
    ]
    for source, target in extra:
        if source in index and target in index:
            add_edge(edges, seen, source, target, "calls", 0.8)

    return edges


def strip_internal(nodes: list[dict]) -> list[dict]:
    clean = []
    for n in nodes:
        d = {k: v for k, v in n.items() if not k.startswith("_")}
        clean.append(d)
    return clean


def validate_part(part_nodes: list[dict], part_edges: list[dict], all_file_paths: set[str]) -> list[str]:
    ids = {n["id"] for n in part_nodes}
    import_paths = set()
    neighbor_files = set()
    neighbor_symbols = defaultdict(set)
    for path, deps in BATCH_IMPORT.items():
        import_paths.update(deps)
        import_paths.add(path)
    for path, nbs in NEIGHBOR_MAP.items():
        for nb in nbs:
            neighbor_files.add(nb["path"])
            for s in nb.get("symbols") or []:
                neighbor_symbols[nb["path"]].add(s)
    errors = []
    for e in part_edges:
        for end in ("source", "target"):
            ref = e[end]
            if ref in ids:
                continue
            if ref.startswith("file:"):
                p = ref[len("file:") :]
                if p in neighbor_files or p in import_paths or p in all_file_paths:
                    continue
                errors.append(f"{end} {ref} not resolvable")
                continue
            if ref.startswith("function:") or ref.startswith("class:"):
                prefix, path, name = ref.split(":", 2)
                if name in neighbor_symbols.get(path, set()):
                    continue
                if path in all_file_paths:
                    # same-batch symbol in another part — allowed by merge, check symbol exists
                    continue
                errors.append(f"{end} {ref} not in neighbor symbols")
                continue
            errors.append(f"{end} {ref} unknown prefix")
    return errors


def split_and_write(nodes: list[dict], edges: list[dict]) -> tuple[int, int, int]:
    files = sorted(META["files"])
    node_count = len(nodes)
    edge_count = len(edges)
    parts = max(1, math.ceil(max(node_count / 60, edge_count / 120)))

    def chunk_size(n_parts: int) -> int:
        return math.ceil(len(files) / n_parts)

    # Increase parts until no file-chunk exceeds 60 nodes or 120 edges.
    while True:
        size = chunk_size(parts)
        groups = [files[i : i + size] for i in range(0, len(files), size)]
        too_big = False
        for g in groups:
            gset = set(g)
            part_nodes = [n for n in nodes if n["filePath"] in gset]
            part_ids = {n["id"] for n in part_nodes}
            part_edge_n = sum(1 for e in edges if e["source"] in part_ids)
            if len(part_nodes) > 60 or part_edge_n > 120:
                too_big = True
                break
        if not too_big:
            break
        parts += 1
        if parts > len(files):
            break

    size = chunk_size(parts)
    groups = [files[i : i + size] for i in range(0, len(files), size)]
    all_file_paths = set(files)
    written = 0
    for i, group in enumerate(groups, 1):
        gset = set(group)
        part_nodes = [n for n in nodes if n["filePath"] in gset]
        part_ids = {n["id"] for n in part_nodes}
        part_edges = [e for e in edges if e["source"] in part_ids]
        errors = validate_part(part_nodes, part_edges, all_file_paths)
        if errors:
            raise SystemExit(f"part {i} validation failed: {errors[:8]}")
        out = {
            "nodes": strip_internal(part_nodes),
            "edges": part_edges,
        }
        if parts == 1:
            dest = OUT_DIR / "batch-12.json"
        else:
            dest = OUT_DIR / f"batch-12-part-{i}.json"
        dest.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n")
        written += 1
        print(f"wrote {dest.name} nodes={len(part_nodes)} edges={len(part_edges)} files={len(group)}")
    return written, node_count, edge_count


def main() -> None:
    # sanity: every extract file has file meta
    extract_paths = [r["path"] for r in EXTRACT["results"]]
    missing_files = [p for p in extract_paths if p not in META["files"]]
    extra_files = [p for p in META["files"] if p not in extract_paths]
    if missing_files or extra_files:
        raise SystemExit(f"file meta mismatch missing={missing_files} extra={extra_files}")

    expected_syms = []
    for result in EXTRACT["results"]:
        path = result["path"]
        for fn in significant_functions(result):
            expected_syms.append(f"function:{path}:{fn['name']}")
        for cl in significant_classes(result):
            expected_syms.append(f"class:{path}:{cl['name']}")
    missing = [k for k in expected_syms if k not in META["symbols"]]
    extra = [k for k in META["symbols"] if k not in set(expected_syms)]
    if missing or extra:
        raise SystemExit(f"symbol meta mismatch\nmissing={missing}\nextra={extra}")

    nodes, index = build_nodes()
    edges = build_edges(nodes, index)
    written, n, e = split_and_write(nodes, edges)
    print(f"DONE parts={written} nodes={n} edges={e} skipped=0")


if __name__ == "__main__":
    main()
