Below is a single copy-paste file (README-like) that combines the verification checklist, commands, SQL, API calls, and the code snippets (Node.js API, FastAPI ML service, scoring utils). Save as e.g., `autolearn_audit_and_code_bundle.txt` or `autolearn_bundle.md`. Paste into your editor/Slack/email and send to your sister or devs.

---
Title: Autonomous Learning Verification, Tests, Commands & Starter Code Bundle
Purpose: Single-file bundle containing checklist, diagnostics, SQL queries, retrain triggers, and starter code (Node API, FastAPI ML, scoring) to verify whether your system is truly learning and to enable retraining and testing.

===============================================================================
SECTION A — COPY-PASTE MESSAGE FOR SISTER
===============================================================================
Hey [Sis],

Quick summary of our autonomous learning system and what I need your help verifying.

1) What the system is supposed to do
- Ingest user interactions, symptom reports, outcomes, and feedback.
- Update models/recommendations so future suggestions improve.
- Store provenance (which remedies, sources, and user context led to an outcome).
- Respect safety rules and contraindication checks while adapting.

2) Possible behaviors we might be seeing
- Retention only: stores data but never updates models/logic.
- True learning: updates models/knowledge and improves outputs over time.

3) Quick checklist (run or ask devs)
- Are model/artifact versions updated automatically after new data?
- Is there an automated retrain pipeline? (Daily/Weekly/Manual/Never)
- Do model metrics (loss, NDCG) change after ingesting new data?
- Does user feedback (helpful/not helpful) feed back into training?
- Is there an audit trail linking data → model change → deployment?

4) Concrete tests to run now
- Controlled input drift test: record T0 outputs for 20 queries, simulate feedback, trigger retrain, record T1, compare.
- Cold-start new data test: insert new remedy + feedback, retrain, check surfacing.
- Drift detection test: track weekly NDCG@5, precision@k.

5) If only retaining, do this:
- Build automated retrain pipeline (ETL → train → eval → deploy).
- Version models and datasets; enable canary deploys.
- Map feedback -> training labels with QC.
- Add monitoring and safety gating.

— [Your name]

===============================================================================
SECTION B — QUICK VERIFICATION CHECKLIST (DEV COPY)
===============================================================================
1) Quick yes/no
- Automated retrain pipeline?
- Model/artifact versioning with timestamps?
- User feedback stored and usable?
- Audit log linking data → model → deploy?
- Production holdout/validation set?

2) Systems to inspect
- CI/CD: GitHub Actions / Jenkins
- Model registry: MLflow / DVC / S3+metadata
- Pipelines: Airflow / Prefect / Kubeflow
- Feedback: Postgres table / Kafka topic
- Search/KG: Elasticsearch / FAISS / Neo4j
- Monitoring: Prometheus/Grafana, Sentry

===============================================================================
SECTION C — COMMANDS & CHECKS
===============================================================================
MLflow list models:
mlflow models list --model-uri models:/NaturalHeals/Production

Git last commit:
git -C /path/to/repo log -1 --pretty=format:"%h %ci %s"

GitHub recent runs:
gh run list --repo owner/repo --limit 5

K8s cronjobs:
kubectl get cronjob -n ml
kubectl describe cronjob <retrain-job-name> -n ml

===============================================================================
SECTION D — SQL SNIPPETS (Postgres)
===============================================================================
-- Recent feedback (last 30 days)
SELECT id, user_id, remedy_id, feedback, created_at
FROM user_feedback
WHERE created_at >= now() - interval '30 days'
ORDER BY created_at DESC
LIMIT 200;

-- Helpful vs not_helpful per remedy
SELECT remedy_id,
  SUM(CASE WHEN feedback='helpful' THEN 1 ELSE 0 END) as helpful_count,
  SUM(CASE WHEN feedback='not_helpful' THEN 1 ELSE 0 END) as not_helpful_count
FROM user_feedback
GROUP BY remedy_id
ORDER BY helpful_count DESC
LIMIT 100;

-- Model versions
SELECT version, model_uri, deployed_at, changelog
FROM model_versions
ORDER BY deployed_at DESC
LIMIT 10;

-- Insert synthetic feedback (example)
INSERT INTO user_feedback (user_id, remedy_id, feedback, created_at)
VALUES ('sim-user', 'remedy-123', 'helpful', now());

===============================================================================
SECTION E — DIAGNOSTIC SQL/ANALYSIS
===============================================================================
-- Rank-shift comparison pseudo-query (store results per run)
SELECT q.query_text, r1.remedy_id as rem_t0, r1.rank as rank_t0, r2.remedy_id as rem_t1, r2.rank as rank_t1
FROM query_results r1
JOIN query_results r2 ON r1.query_text = r2.query_text
JOIN runs run1 ON r1.run_id = run1.id AND run1.model_version = 'v1.2.3'
JOIN runs run2 ON r2.run_id = run2.id AND run2.model_version = 'v1.3.0'
WHERE r1.query_text IN ('query1','query2',...);

-- Helpfulness before vs after deploy date
SELECT
  SUM(CASE WHEN created_at < '2026-03-01' AND feedback='helpful' THEN 1 ELSE 0 END) as helpful_before,
  SUM(CASE WHEN created_at >= '2026-03-01' AND feedback='helpful' THEN 1 ELSE 0 END) as helpful_after
FROM user_feedback;

===============================================================================
SECTION F — TRIGGERING RETRAIN (examples)
===============================================================================
Airflow trigger (API):
curl -X POST "https://airflow.example.com/api/v1/dags/retrain_dag/dagRuns" \
  -H "Content-Type: application/json" \
  -d '{"conf": {"source": "manual_test"}}'

Kubernetes cronjob one-off:
kubectl create job retrain-manual-$(date +%s) --from=cronjob/retrain-cron -n ml

GitHub Actions workflow dispatch:
gh workflow run retrain.yml --repo owner/repo --ref main --field source=manual

===============================================================================
SECTION G — METRICS TO MONITOR
===============================================================================
Model metrics:
- Train/val loss
- NDCG@5, Precision@1/3/5, Recall@k
- Calibration (pred prob vs empirical)

Production metrics:
- % sessions with feedback
- Helpfulness rate = helpful_count / total_feedback
- Rank shift percentage after retrain
- Emergency-intercept rate

Data quality:
- % missing fields in feedback
- Duplicate/bot feedback rate

===============================================================================
SECTION H — SAFETY & GATING CHECKS (MANDATORY BEFORE DEPLOY)
===============================================================================
Run a safety test-suite before any model affecting high-risk conditions:
- Emergency-intercept checks (no regression)
- Contraindication regression tests
- Human-review for large changes in top recommendations for critical queries

===============================================================================
SECTION I — STARTER CODE: Node.js API (server.js)
===============================================================================
Save as `server.js`. This is a small Express endpoint that queries an ML microservice and returns candidate remedies (mock DB entry). Modify REMEDY_DB integration as needed.

```javascript
// server.js
const express = require('express');
const fetch = require('node-fetch');
const app = express();
app.use(express.json());

// Simple in-memory remedy DB (replace with real DB)
const REMEDY_DB = {
  byCondition: {
    'c1': [{ id: 'r2', title: 'Peppermint oil for headache', evidence_level: 'study-supported' }],
    'c2': [{ id: 'r1', title: 'Ginger tea for nausea', evidence_level: 'traditional' }]
  }
};

function computeServerScore(remedy, userProfile) {
  // placeholder scoring
  const evidenceWeight = { 'study-supported': 1.0, 'traditional': 0.6, 'anecdotal': 0.3 };
  const e = evidenceWeight[remedy.evidence_level] || 0.4;
  let p = 0;
  if (userProfile && userProfile.allergies) {
    (remedy.allergens || []).forEach(a => { if (userProfile.allergies.includes(a)) p -= 0.8; });
  }
  const similarity = remedy._cond_score || 0.5;
  const community = remedy._community_score || 0.5;
  const score = 1 / (1 + Math.exp(-(2.0*e + 1.5*similarity + 1.0*community + p)));
  return score;
}

app.post('/v2/parse', async (req, res) => {
  const { text, userProfile } = req.body;
  if (!text) return res.status(400).json({ error: 'text required' });

  // Call ML microservice
  const mlResp = await fetch((process.env.ML_SERVICE || 'http://localhost:8000') + '/parse', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ text, top_k: 6 })
  }).then(r=>r.json()).catch(err=>({ conditions: [] }));

  let candidates = [];
  for (const c of (mlResp.conditions || [])) {
    const remedies = REMEDY_DB.byCondition[c.id] || [];
    remedies.forEach(r => { r._cond_score = c.score; candidates.push(r); });
  }
  const dedup = new Map();
  candidates.forEach(r => { if (!dedup.has(r.id)) dedup.set(r.id, r); });
  const scored = Array.from(dedup.values()).map(r => {
    r.computed_score = computeServerScore(r, userProfile || {});
    return r;
  }).sort((a,b)=>b.computed_score - a.computed_score);

  res.json({ parsed_conditions: mlResp.conditions || [], recommended_remedies: scored.slice(0,12) });
});

app.listen(3000, ()=> console.log('Server running on :3000'));
```

Run:
- npm init -y
- npm install express node-fetch
- node server.js

===============================================================================
SECTION J — STARTER CODE: FastAPI ML Microservice (ml_service/main.py)
===============================================================================
Save as `ml_service/main.py`. Small service using sentence-transformers and FAISS for condition retrieval. Precompute embeddings as `condition_embs.npy` and load `CONDITION_META.json`.

```python
# ml_service/main.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
import numpy as np
import faiss
import json
import uvicorn
import os

MODEL = SentenceTransformer('all-mpnet-base-v2')
CONDITION_EMBS = np.load(os.path.join('data','condition_embs.npy'))  # shape (N,D)
INDEX = faiss.IndexFlatIP(CONDITION_EMBS.shape[1])
INDEX.add(CONDITION_EMBS)
with open(os.path.join('data','condition_meta.json')) as f:
    CONDITION_META = json.load(f)

app = FastAPI()

class ParseRequest(BaseModel):
    text: str
    user_profile: dict = None
    top_k: int = 5

@app.post("/parse")
async def parse(req: ParseRequest):
    if not req.text:
        raise HTTPException(status_code=400, detail="text required")
    emb = MODEL.encode(req.text, normalize_embeddings=True)
    D, I = INDEX.search(np.array([emb]), req.top_k)
    results = []
    for score, idx in zip(D[0], I[0]):
        meta = CONDITION_META[idx]
        results.append({"id": meta['id'], "name": meta['name'], "score": float(score), "matched_terms": meta.get('keywords', [])})
    return {"conditions": results}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

Install and run:
- pip install fastapi uvicorn sentence-transformers faiss-cpu numpy
- Place `data/condition_embs.npy` and `data/condition_meta.json`.
- python ml_service/main.py

===============================================================================
SECTION K — STARTER CODE: Scoring Utility (scoring.py)
===============================================================================
Save as `scoring.py` and import in Python services to compute final ranking scores.

```python
# scoring.py
import math

def sigmoid(x):
    return 1 / (1 + math.exp(-x))

def compute_score(remedy, similarity, user_profile, community_stats):
    e = remedy.get('evidence_score', 0.4)
    p = 0.0
    for c in remedy.get('contraindications', []):
        if c in user_profile.get('chronic_conditions', []): p -= 1.0
    for a in remedy.get('allergens', []):
        if a in user_profile.get('allergies', []): p -= 0.8
    drug_interaction_penalty = remedy.get('interaction_severity', 0.0)
    community = community_stats.get(remedy['id'], {}).get('score', 0.5)
    score = sigmoid(2.0*e + 1.5*similarity + 1.0*community - 2.0*drug_interaction_penalty + p)
    return score
```

===============================================================================
SECTION L — SAFE RETRAIN PIPELINE (CI YAML snippet)
===============================================================================
Example GitHub Actions workflow to trigger retrain on push to `main`. Save as `.github/workflows/retrain.yml`.

```yaml
name: retrain
on:
  workflow_dispatch:
  push:
    branches:
      - main

jobs:
  retrain:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up Python
        uses: actions/setup-python@v4
        with: python-version: '3.10'
      - name: Install deps
        run: pip install -r requirements.txt
      - name: Run training
        run: python scripts/train.py --config configs/retrain_config.yaml
      - name: Run safety tests
        run: python tests/safety_tests.py
      - name: Push model artifact
        run: python scripts/push_model.py --artifact models:/NaturalHeals/Production
```

Note: `scripts/train.py`, `tests/safety_tests.py`, and `scripts/push_model.py` must be implemented to your stack.

===============================================================================
SECTION M — NEXT STEPS & ACTION ITEMS (one-line each)
===============================================================================
- Run the quick checks in SECTION C and SECTION D.
- Execute Controlled input drift test (see SECTION D + insert synthetic feedback).
- Trigger retrain (SECTION F) and compare T0/T1 outputs.
- If only retaining, implement ETL -> training -> eval -> deploy with gating.
- Add model_versions and audit logs; enable canary deploys.

===============================================================================
SECTION N — OFFERED HELP
===============================================================================
I can now:
- generate API request/response templates to capture T0/T1 results,
- produce a CI job `train.py` scaffold,
- or draft the safety test-suite in Python.

Tell me which of those you want next.

--- End of bundle. Paste this whole file to devs or your sister.