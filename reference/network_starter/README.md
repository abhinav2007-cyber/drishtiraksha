# Network & Propagation Intelligence (Member 3)

A starter module for analyzing relationships between accounts, detecting potentially coordinated patterns, and producing evidence-backed propagation timelines.

## Important interpretation limits

- This project uses synthetic demonstration data. It is not evidence about real accounts.
- A coordination score is a heuristic score, not a probability or proof of intent.
- Shared claims alone do not establish coordination.
- The earliest timestamp is the earliest observation in the supplied dataset, not necessarily the original source.
- Only explicit `parent_post_id` references are treated as observed repost/propagation links.

## Setup (Windows PowerShell)

```powershell
py -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

If `py` is unavailable, use `python` instead.

## Run the demo

```powershell
python run_demo.py
```

Outputs are written to `outputs/`:
- `investigation_results.json`
- `network_graph.png` (if Matplotlib is installed)

## Run tests

```powershell
python -m pytest -q
```

## Main functions

```python
from network_intelligence import build_network, detect_coordination, get_propagation

graph = build_network(posts)
coordination = detect_coordination(graph)
propagation = get_propagation(posts, claim_id="CLAIM_BANK_01")
```

### Input post fields

Required:
- `account_id`: account identifier
- `timestamp`: ISO-8601 timestamp

Recommended:
- `post_id`: unique post identifier
- `claim_id`: canonical claim/group ID from Member 2
- `media_hash`: exact media fingerprint from Member 1 or the backend
- `language`: language code such as `en`, `hi`, `te`
- `parent_post_id`: observed parent/repost reference, if available
- `claim_similarity`: optional semantic similarity score in [0, 1] supplied by an upstream component

## Integration notes for Member 5

- `build_network()` returns a NetworkX graph. Use `graph_to_json()` to serialize it into frontend-friendly `nodes` and `edges` arrays.
- `detect_coordination()` returns clusters, supporting edges, reasons, unclustered accounts and limitations.
- `get_propagation()` returns a chronological timeline and only explicit observed parent-reference links.
- Run the analysis in a worker/background job for larger datasets; this starter implementation compares account pairs and is intended for small-to-medium demo datasets.

## Current limitations / next improvements

1. The starter uses exact `claim_id` matching and optional upstream `claim_similarity`; it does not independently run a multilingual embedding model.
2. Exact media hashes detect identical files only. Add perceptual hashes for resized or compressed images/videos.
3. The pairwise implementation is O(A² × P²) in the straightforward worst case; optimize with inverted indexes by claim ID and media hash for larger datasets.
4. The scoring weights and threshold are demonstration heuristics and must be calibrated against labeled positive and negative examples before real-world use.
5. Connected components can chain together; inspect edge-level evidence and consider stricter cluster validation for production.
