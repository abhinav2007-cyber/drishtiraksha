"""DRISHTIRAKSHA — Network & Propagation Intelligence (NETWORK_AI & PROPAGATION).

Adapts the verified reference algorithms from `reference/network_starter/network_intelligence.py`
into production modules with strict safeguards:
- Requires multiple independent signals for candidate coordination.
- Centrality metrics (degree centrality, betweenness centrality).
- Transparent heuristic score, not calibrated probabilities.
- Never labels accounts as bots without specific bot evidence.
- Preserves observed repost lineages without inferring causation from timestamps alone.
"""
from __future__ import annotations

import logging
from collections import Counter, defaultdict
from datetime import datetime, timezone
from itertools import combinations
from typing import Any, Iterable

import networkx as nx

from backend.schemas import (
    CoordinationCluster,
    CoordinationResult,
    ModuleStatusEnum,
    NetworkEdge,
    NetworkGraph,
    NetworkNode,
    NetworkResult,
    PropagationLink,
    PropagationResult,
    PropagationTimelineEntry,
)

logger = logging.getLogger(__name__)

DEFAULT_WINDOW_MINUTES = 5
DEFAULT_COORDINATION_THRESHOLD = 0.65
DEFAULT_MIN_CLUSTER_SIZE = 3


def parse_timestamp(value: str) -> datetime:
    """Parse ISO-8601 timestamps; naive timestamps are treated as UTC for consistency."""
    if not isinstance(value, str) or not value.strip():
        raise ValueError("Each post must contain a non-empty ISO timestamp.")
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise ValueError(f"Invalid ISO timestamp: {value!r}") from exc
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def validate_posts(posts: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
    """Validate and normalize user-submitted post records."""
    if posts is None:
        raise ValueError("posts cannot be None")
    normalized: list[dict[str, Any]] = []
    for index, raw in enumerate(posts):
        if not isinstance(raw, dict):
            raise ValueError(f"Post at index {index} must be a dictionary")
        account_id = raw.get("account_id")
        if not isinstance(account_id, str) or not account_id.strip():
            raise ValueError(f"Post at index {index} is missing account_id")
        item = dict(raw)
        item["account_id"] = account_id.strip()
        item["_timestamp"] = parse_timestamp(raw.get("timestamp"))
        item["post_id"] = str(raw.get("post_id") or f"post_{index + 1}")
        normalized.append(item)
    return normalized


def pair_evidence(
    posts_a: list[dict[str, Any]],
    posts_b: list[dict[str, Any]],
    window_minutes: int,
) -> dict[str, Any]:
    """Aggregate the strongest observed signals between two accounts."""
    same_claim = False
    shared_media_hashes: set[str] = set()
    closest_minutes: float | None = None
    supplied_similarity = 0.0
    matched_post_pairs = 0

    for a in posts_a:
        for b in posts_b:
            claim_a, claim_b = a.get("claim_id"), b.get("claim_id")
            if claim_a and claim_b and claim_a == claim_b:
                same_claim = True
                matched_post_pairs += 1

            hash_a, hash_b = a.get("media_hash"), b.get("media_hash")
            if hash_a and hash_b and hash_a == hash_b:
                shared_media_hashes.add(str(hash_a))

            delta = abs((a["_timestamp"] - b["_timestamp"]).total_seconds()) / 60
            if closest_minutes is None or delta < closest_minutes:
                closest_minutes = delta

            for key in ("claim_similarity",):
                for source in (a, b):
                    value = source.get(key)
                    if isinstance(value, (int, float)) and 0 <= value <= 1:
                        supplied_similarity = max(supplied_similarity, float(value))

    temporal_match = closest_minutes is not None and closest_minutes <= window_minutes
    media_match = bool(shared_media_hashes)
    claim_similarity = max(1.0 if same_claim else 0.0, supplied_similarity)

    # Transparent heuristic score, not a calibrated probability.
    score = (
        0.25 * float(same_claim)
        + 0.35 * float(media_match)
        + 0.20 * float(temporal_match)
        + 0.20 * supplied_similarity
    )

    reasons: list[str] = []
    if same_claim:
        reasons.append("same_canonical_claim_id")
    if media_match:
        reasons.append("shared_exact_media_hash")
    if temporal_match:
        reasons.append(f"posts_within_{window_minutes}_minute_window")
    if supplied_similarity >= 0.85:
        reasons.append("high_supplied_semantic_claim_similarity")

    # Strict Safeguard: Require at least two meaningful signals, including media or close timing.
    signal_count = sum((same_claim, media_match, temporal_match, supplied_similarity >= 0.85))
    coordination_eligible = (
        signal_count >= 2
        and (media_match or temporal_match)
        and score >= DEFAULT_COORDINATION_THRESHOLD
    )

    return {
        "score": round(score, 4),
        "same_claim": same_claim,
        "shared_media_hashes": sorted(shared_media_hashes),
        "closest_time_difference_minutes": (
            round(closest_minutes, 2) if closest_minutes is not None else None
        ),
        "temporal_match": temporal_match,
        "claim_similarity": round(claim_similarity, 4),
        "supplied_semantic_similarity": round(supplied_similarity, 4),
        "signal_count": signal_count,
        "matched_post_pairs": matched_post_pairs,
        "reasons": reasons,
        "coordination_eligible": coordination_eligible,
    }


def build_network_graph(
    posts: Iterable[dict[str, Any]],
    window_minutes: int = DEFAULT_WINDOW_MINUTES,
) -> nx.Graph:
    """Build NetworkX account graph with explainable content-association edges."""
    if window_minutes < 0:
        raise ValueError("window_minutes must be >= 0")
    rows = validate_posts(posts)
    by_account: dict[str, list[dict[str, Any]]] = defaultdict(list)
    graph = nx.Graph(name="Network & Propagation Intelligence")

    for post in rows:
        by_account[post["account_id"]].append(post)

    for account_id, account_posts in by_account.items():
        graph.add_node(
            account_id,
            posts_count=len(account_posts),
            languages=sorted({p.get("language", "unknown") for p in account_posts}),
            platforms=sorted({p.get("platform", "unknown") for p in account_posts}),
        )

    for account_a, account_b in combinations(sorted(by_account), 2):
        evidence = pair_evidence(by_account[account_a], by_account[account_b], window_minutes)
        if evidence["same_claim"] or evidence["shared_media_hashes"] or evidence["supplied_semantic_similarity"] >= 0.85:
            graph.add_edge(account_a, account_b, **evidence)

    return graph


def detect_coordination_clusters(
    graph: nx.Graph,
    threshold: float = DEFAULT_COORDINATION_THRESHOLD,
    min_cluster_size: int = DEFAULT_MIN_CLUSTER_SIZE,
) -> dict[str, Any]:
    """Find groups connected by sufficiently strong, multi-signal relationships."""
    if not isinstance(graph, nx.Graph):
        raise TypeError("graph must be a NetworkX Graph")
    if not 0 <= threshold <= 1:
        raise ValueError("threshold must be between 0 and 1")
    if min_cluster_size < 2:
        raise ValueError("min_cluster_size must be at least 2")

    coordination_graph = nx.Graph()
    coordination_graph.add_nodes_from(graph.nodes(data=True))
    for a, b, data in graph.edges(data=True):
        if data.get("coordination_eligible") and data.get("score", 0) >= threshold:
            coordination_graph.add_edge(a, b, **data)

    clusters = []
    components = sorted(
        (set(c) for c in nx.connected_components(coordination_graph) if len(c) >= min_cluster_size),
        key=lambda c: (-len(c), sorted(c)),
    )
    for index, accounts in enumerate(components, start=1):
        internal_edges = [
            data for a, b, data in coordination_graph.subgraph(accounts).edges(data=True)
        ]
        reason_counts = Counter(reason for edge in internal_edges for reason in edge.get("reasons", []))
        average_score = sum(edge.get("score", 0) for edge in internal_edges) / max(len(internal_edges), 1)
        clusters.append({
            "cluster_id": f"CLUSTER_{index:02d}",
            "accounts": sorted(accounts),
            "account_count": len(accounts),
            "coordination_score": round(average_score * 100, 1),
            "status": "POTENTIALLY_COORDINATED",
            "reasons": [
                {"reason": reason, "observed_edge_count": count}
                for reason, count in sorted(reason_counts.items())
            ],
            "supporting_edges": [
                {"source": a, "target": b, "score": round(data.get("score", 0) * 100, 1),
                 "reasons": data.get("reasons", [])}
                for a, b, data in sorted(
                    coordination_graph.subgraph(accounts).edges(data=True),
                    key=lambda item: (item[0], item[1]),
                )
            ],
            "interpretation": "A pattern requiring human review; not proof of shared ownership, bots, or malicious intent.",
        })

    clustered_accounts = {account for cluster in clusters for account in cluster["accounts"]}
    return {
        "status": "COMPLETED",
        "clusters": clusters,
        "clustered_account_count": len(clustered_accounts),
        "unclustered_accounts": sorted(set(graph.nodes) - clustered_accounts),
        "threshold": threshold,
        "min_cluster_size": min_cluster_size,
        "method": "thresholded multi-signal graph + connected components",
        "limitations": [
            "Coordination scores are heuristic scores, not probabilities.",
            "Shared content can result from independent users seeing the same event.",
            "Connected components can chain relationships; inspect supporting edges.",
            "The analysis only covers posts present in the supplied dataset.",
        ],
    }


def analyze_network(
    posts: list[dict[str, Any]],
    investigation_id: str,
    window_minutes: int = DEFAULT_WINDOW_MINUTES,
) -> NetworkResult:
    """Analyze accounts, compute centrality, and detect coordination clusters."""
    if not posts:
        return NetworkResult(
            investigation_id=investigation_id,
            status=ModuleStatusEnum.NOT_APPLICABLE,
        )

    g = build_network_graph(posts, window_minutes=window_minutes)
    coord_raw = detect_coordination_clusters(g)

    # Compute Centrality Metrics
    deg_centrality = nx.degree_centrality(g) if len(g) > 0 else {}
    bet_centrality = nx.betweenness_centrality(g) if len(g) > 0 else {}

    nodes = [
        NetworkNode(
            id=node,
            posts_count=attrs.get("posts_count", 0),
            languages=attrs.get("languages", []),
            platforms=attrs.get("platforms", []),
            degree_centrality=round(deg_centrality.get(node, 0.0), 4),
            betweenness_centrality=round(bet_centrality.get(node, 0.0), 4),
        )
        for node, attrs in sorted(g.nodes(data=True))
    ]

    edges = [
        NetworkEdge(
            source=a,
            target=b,
            score=data.get("score", 0.0),
            reasons=data.get("reasons", []),
            coordination_eligible=data.get("coordination_eligible", False),
        )
        for a, b, data in sorted(g.edges(data=True), key=lambda x: (x[0], x[1]))
    ]

    clusters = [
        CoordinationCluster(
            cluster_id=c["cluster_id"],
            accounts=c["accounts"],
            account_count=c["account_count"],
            coordination_score=c["coordination_score"],
            status=c["status"],
            reasons=c["reasons"],
            supporting_edges=c["supporting_edges"],
            interpretation=c["interpretation"],
        )
        for c in coord_raw.get("clusters", [])
    ]

    coordination_res = CoordinationResult(
        status=ModuleStatusEnum.COMPLETED,
        clusters=clusters,
        clustered_account_count=coord_raw.get("clustered_account_count", 0),
        unclustered_accounts=coord_raw.get("unclustered_accounts", []),
        threshold=coord_raw.get("threshold"),
        min_cluster_size=coord_raw.get("min_cluster_size"),
        method=coord_raw.get("method", ""),
        limitations=coord_raw.get("limitations", []),
    )

    return NetworkResult(
        investigation_id=investigation_id,
        status=ModuleStatusEnum.COMPLETED,
        network=NetworkGraph(nodes=nodes, edges=edges),
        coordination=coordination_res,
    )


def analyze_propagation(
    posts: list[dict[str, Any]],
    investigation_id: str,
    claim_id: str | None = None,
) -> PropagationResult:
    """Compute chronological timeline and observed parent-repost links."""
    if not posts:
        return PropagationResult(
            investigation_id=investigation_id,
            status=ModuleStatusEnum.NOT_APPLICABLE,
        )

    rows = validate_posts(posts)
    if claim_id is not None:
        rows = [p for p in rows if p.get("claim_id") == claim_id]
    rows.sort(key=lambda p: (p["_timestamp"], p["post_id"]))

    post_ids = {p["post_id"] for p in rows}
    timeline: list[PropagationTimelineEntry] = []
    observed_links: list[PropagationLink] = []
    language_counts: Counter[str] = Counter()
    account_ids: set[str] = set()

    for post in rows:
        timestamp = post["_timestamp"]
        account_ids.add(post["account_id"])
        language = post.get("language", "unknown")
        language_counts[language] += 1
        parent_id = post.get("parent_post_id")

        timeline.append(
            PropagationTimelineEntry(
                post_id=post["post_id"],
                account_id=post["account_id"],
                timestamp=timestamp.isoformat().replace("+00:00", "Z"),
                claim_id=post.get("claim_id"),
                language=language,
                media_hash=post.get("media_hash"),
                parent_post_id=parent_id,
                activity=post.get("activity", "post"),
            )
        )
        if parent_id and parent_id in post_ids:
            parent = next(p for p in rows if p["post_id"] == parent_id)
            observed_links.append(
                PropagationLink(
                    source_post_id=parent_id,
                    target_post_id=post["post_id"],
                    source_account_id=parent["account_id"],
                    target_account_id=post["account_id"],
                    relationship="observed_parent_reference",
                )
            )

    if rows:
        first = rows[0]["_timestamp"]
        last = rows[-1]["_timestamp"]
        duration_minutes = max((last - first).total_seconds() / 60, 0)
        posts_per_hour = (len(rows) / duration_minutes * 60) if duration_minutes > 0 else None
        first_observed = first.isoformat().replace("+00:00", "Z")
        last_observed = last.isoformat().replace("+00:00", "Z")
    else:
        duration_minutes = 0.0
        posts_per_hour = None
        first_observed = None
        last_observed = None

    return PropagationResult(
        investigation_id=investigation_id,
        status=ModuleStatusEnum.COMPLETED,
        claim_id=claim_id,
        total_posts=len(timeline),
        unique_accounts=len(account_ids),
        first_observed_in_dataset=first_observed,
        last_observed_in_dataset=last_observed,
        observed_duration_minutes=round(duration_minutes, 2),
        average_posts_per_hour=round(posts_per_hour, 2) if posts_per_hour is not None else None,
        language_counts=dict(sorted(language_counts.items())),
        timeline=timeline,
        observed_propagation_links=observed_links,
    )
