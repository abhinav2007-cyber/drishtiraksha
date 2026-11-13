"""Run the sample network, coordination, and propagation analysis."""
import json
from pathlib import Path

from network_intelligence import (
    build_network,
    detect_coordination,
    get_propagation,
    graph_to_json,
)

BASE_DIR = Path(__file__).resolve().parent
DATA_PATH = BASE_DIR / "data" / "sample_posts.json"
OUTPUT_DIR = BASE_DIR / "outputs"
OUTPUT_DIR.mkdir(exist_ok=True)

with DATA_PATH.open("r", encoding="utf-8") as file:
    posts = json.load(file)

graph = build_network(posts)
coordination = detect_coordination(graph)
propagation = get_propagation(posts, claim_id="CLAIM_BANK_01")

results = {
    "module": "network_intelligence",
    "network": graph_to_json(graph),
    "coordination": coordination,
    "propagation": propagation,
    "dataset_label": "SYNTHETIC_DEMO_DATA",
}

output_path = OUTPUT_DIR / "investigation_results.json"
with output_path.open("w", encoding="utf-8") as file:
    json.dump(results, file, indent=2, ensure_ascii=False)

print("\n=== NETWORK INTELLIGENCE DEMO ===")
print(f"Accounts: {graph.number_of_nodes()}")
print(f"Content relationship edges: {graph.number_of_edges()}")
print(f"Potential coordination clusters: {len(coordination['clusters'])}")
for cluster in coordination["clusters"]:
    print(f"  {cluster['cluster_id']}: {', '.join(cluster['accounts'])} "
          f"(score={cluster['coordination_score']})")
print(f"Unclustered accounts: {len(coordination['unclustered_accounts'])}")
print(f"Propagation posts for CLAIM_BANK_01: {propagation['total_posts']}")
print(f"Observed repost links: {len(propagation['observed_propagation_links'])}")
print(f"\nFull JSON saved to: {output_path}")

# Optional graph image; visualization is not required for the core functions.
try:
    import matplotlib.pyplot as plt
    import networkx as nx

    positions = nx.spring_layout(graph, seed=7)
    coordination_edges = [
        (a, b) for a, b, data in graph.edges(data=True)
        if data.get("coordination_eligible")
    ]
    other_edges = [
        (a, b) for a, b, data in graph.edges(data=True)
        if not data.get("coordination_eligible")
    ]
    plt.figure(figsize=(12, 8))
    nx.draw_networkx_nodes(graph, positions, node_size=850, node_color="#8ecae6")
    nx.draw_networkx_labels(graph, positions, font_size=8)
    nx.draw_networkx_edges(graph, positions, edgelist=other_edges, edge_color="#b8b8b8", style="dashed")
    nx.draw_networkx_edges(graph, positions, edgelist=coordination_edges, edge_color="#e76f51", width=2.5)
    plt.title("Account relationship graph (synthetic demo)")
    plt.axis("off")
    plt.tight_layout()
    image_path = OUTPUT_DIR / "network_graph.png"
    plt.savefig(image_path, dpi=160)
    plt.close()
    print(f"Graph image saved to: {image_path}")
except ImportError:
    print("Matplotlib is not installed; skipping graph image.")
