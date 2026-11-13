import json
from pathlib import Path

from network_intelligence import build_network, detect_coordination, get_propagation

ROOT = Path(__file__).resolve().parents[1]


def load_posts():
    with (ROOT / "data" / "sample_posts.json").open(encoding="utf-8") as file:
        return json.load(file)


def test_build_network_contains_all_accounts():
    posts = load_posts()
    graph = build_network(posts)
    assert graph.number_of_nodes() == 15
    assert graph.has_edge("A01", "A02")


def test_detects_labeled_coordinated_example_only():
    result = detect_coordination(build_network(load_posts()))
    assert len(result["clusters"]) == 1
    assert set(result["clusters"][0]["accounts"]) == {"A01", "A02", "A03", "A04", "A05"}
    assert {"B01", "B02", "B03", "B04"}.issubset(set(result["unclustered_accounts"]))
    assert {"C01", "C02", "C03", "D01", "D02", "D03"}.issubset(set(result["unclustered_accounts"]))


def test_edges_have_explainable_reasons():
    graph = build_network(load_posts())
    edge = graph["A01"]["A02"]
    assert "same_canonical_claim_id" in edge["reasons"]
    assert "shared_exact_media_hash" in edge["reasons"]
    assert edge["coordination_eligible"] is True


def test_propagation_uses_observed_parent_links():
    result = get_propagation(load_posts(), claim_id="CLAIM_BANK_01")
    assert result["total_posts"] == 9
    assert result["unique_accounts"] == 9
    assert len(result["observed_propagation_links"]) == 4
    assert result["timeline"][0]["post_id"] == "P001"


def test_invalid_timestamp_fails_clearly():
    bad_posts = [{"account_id": "X", "timestamp": "not-a-date"}]
    try:
        build_network(bad_posts)
    except ValueError as exc:
        assert "Invalid ISO timestamp" in str(exc)
    else:
        raise AssertionError("Expected invalid timestamp to raise ValueError")
