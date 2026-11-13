"""
Tests for Stage 5: Live Input-Driven Network & Propagation Intelligence.
1. Validation of canonical social post format (reject missing accounts/timestamps).
2. Graph construction (nodes, edges, centrality metrics).
3. Explainable multi-signal candidate coordination clustering.
4. Independent signal requirement (no clusters on time or text overlap alone).
5. Chronological propagation analysis, velocity, and observed parent-repost links.
6. Honest interpretation limits and conservative statuses.
"""

import pytest

from backend.modules.network_ai.service import (
    analyze_network,
    analyze_propagation,
    build_network_graph,
    detect_coordination_clusters,
    pair_evidence,
    validate_posts,
)
from backend.schemas import ModuleStatusEnum


@pytest.fixture
def sample_coordinated_posts():
    """A realistic 4-account dataset with 3 coordinated accounts sharing claims & media within 2 minutes."""
    return [
        {
            "post_id": "p1",
            "account_id": "account_alpha",
            "timestamp": "2026-11-13T10:00:00Z",
            "claim_id": "claim_flood_relief",
            "media_hash": "sha256_mock_hash_12345",
            "language": "en",
            "platform": "twitter",
        },
        {
            "post_id": "p2",
            "account_id": "account_beta",
            "timestamp": "2026-11-13T10:01:30Z",
            "claim_id": "claim_flood_relief",
            "media_hash": "sha256_mock_hash_12345",
            "language": "en",
            "platform": "twitter",
            "parent_post_id": "p1",
        },
        {
            "post_id": "p3",
            "account_id": "account_gamma",
            "timestamp": "2026-11-13T10:02:15Z",
            "claim_id": "claim_flood_relief",
            "media_hash": "sha256_mock_hash_12345",
            "language": "en",
            "platform": "telegram",
            "parent_post_id": "p2",
        },
        {
            "post_id": "p4",
            "account_id": "account_independent_delta",
            "timestamp": "2026-11-13T14:30:00Z",
            "claim_id": "unrelated_sports_event",
            "language": "en",
            "platform": "twitter",
        },
    ]


def test_validate_posts_schema():
    """Missing account_id or invalid timestamps must raise ValueError."""
    with pytest.raises(ValueError, match="missing account_id"):
        validate_posts([{"post_id": "p1", "timestamp": "2026-11-13T10:00:00Z"}])

    with pytest.raises(ValueError, match="Invalid ISO timestamp"):
        validate_posts([{"post_id": "p1", "account_id": "acc1", "timestamp": "not-a-timestamp"}])


def test_build_network_and_centrality(sample_coordinated_posts):
    """Network analysis must generate nodes with degree and betweenness centrality."""
    result = analyze_network(sample_coordinated_posts, investigation_id="inv-net-001")

    assert result.status == ModuleStatusEnum.COMPLETED
    assert len(result.network.nodes) == 4

    node_map = {n.id: n for n in result.network.nodes}
    assert "account_alpha" in node_map
    assert "account_independent_delta" in node_map
    assert node_map["account_alpha"].posts_count == 1
    assert node_map["account_alpha"].degree_centrality is not None

    # Delta has no connections
    assert node_map["account_independent_delta"].degree_centrality == 0.0


def test_coordination_detection_multi_signal(sample_coordinated_posts):
    """Multi-signal coordination requires multiple signals (media match + temporal + claim)."""
    result = analyze_network(sample_coordinated_posts, investigation_id="inv-net-001")

    coord = result.coordination
    assert coord.status == ModuleStatusEnum.COMPLETED
    assert len(coord.clusters) == 1

    cluster = coord.clusters[0]
    assert cluster.cluster_id == "CLUSTER_01"
    assert cluster.account_count == 3
    assert set(cluster.accounts) == {"account_alpha", "account_beta", "account_gamma"}
    assert cluster.coordination_score >= 65.0
    assert "account_independent_delta" in coord.unclustered_accounts


def test_unrelated_breaking_news_not_labeled_coordinated():
    """Accounts posting about breaking news at same time without shared media or claims must not coordinate."""
    breaking_news_posts = [
        {"post_id": "p1", "account_id": "user1", "timestamp": "2026-11-13T12:00:00Z", "claim_id": "c1"},
        {"post_id": "p2", "account_id": "user2", "timestamp": "2026-11-13T12:01:00Z", "claim_id": "c2"},
        {"post_id": "p3", "account_id": "user3", "timestamp": "2026-11-13T12:02:00Z", "claim_id": "c3"},
    ]
    result = analyze_network(breaking_news_posts, investigation_id="inv-net-002")
    assert len(result.coordination.clusters) == 0


def test_propagation_analysis(sample_coordinated_posts):
    """Propagation timeline must preserve explicit parent repost links and calculate spread velocity."""
    result = analyze_propagation(sample_coordinated_posts, investigation_id="inv-prop-001")

    assert result.status == ModuleStatusEnum.COMPLETED
    assert result.total_posts == 4
    assert result.unique_accounts == 4
    assert result.first_observed_in_dataset == "2026-11-13T10:00:00Z"
    assert result.last_observed_in_dataset == "2026-11-13T14:30:00Z"
    assert len(result.observed_propagation_links) == 2

    # Check first repost link (p1 -> p2)
    link1 = result.observed_propagation_links[0]
    assert link1.source_post_id == "p1"
    assert link1.target_post_id == "p2"
    assert link1.source_account_id == "account_alpha"
    assert link1.target_account_id == "account_beta"
