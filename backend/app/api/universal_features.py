"""
USMAN AI GTM - Universal Feature API (Features 1-600)
Exposes endpoints to list all 600 features, execute any feature dynamically,
inspect execution logs, and run automated dry-run smoke tests.
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Dict, Any, List, Optional
from pydantic import BaseModel

from backend.app.services.universal_features_service import (
    UniversalFeatureExecutor, get_all_600_features
)
from backend.app.core.database import get_db_connection
from backend.app.core.security import get_current_user

router = APIRouter(prefix="/features", tags=["Features 1-600 Universal Hub"])

class FeatureExecuteRequest(BaseModel):
    workspace_id: Optional[int] = 1
    lead_id: Optional[int] = None
    context: Optional[Dict[str, Any]] = None
    mode: Optional[str] = "QUALITY MODE"
    dry_run: Optional[bool] = False

@router.get("/catalog")
def get_features_catalog(
    group: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Returns full metadata for all 600 features.
    """
    all_f = get_all_600_features()
    features_list = list(all_f.values())
    if group:
        features_list = [f for f in features_list if group.lower() in f.get("group", "").lower()]
    return {
        "total_features": len(features_list),
        "features": features_list
    }

@router.post("/{feature_id}/execute")
def execute_feature_by_id(
    feature_id: int,
    req: FeatureExecuteRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Executes any registered feature ID (1-600) with lead/workspace context.
    """
    ws_id = current_user.get("workspace_id") or req.workspace_id or 1
    res = UniversalFeatureExecutor.execute(
        feature_id=feature_id,
        lead_id=req.lead_id,
        workspace_id=ws_id,
        context=req.context,
        mode=req.mode or "QUALITY MODE",
        dry_run=bool(req.dry_run)
    )
    return res

@router.get("/history")
def get_feature_execution_history(
    limit: int = 50,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Returns logged feature runs.
    """
    ws_id = current_user.get("workspace_id") or 1
    conn = get_db_connection()
    try:
        rows = conn.execute('''
            SELECT id, workspace_id, feature_id, feature_name, lead_id, status, started_at, finished_at
            FROM feature_execution_logs
            WHERE workspace_id = ?
            ORDER BY id DESC LIMIT ?
        ''', (ws_id, limit)).fetchall()
        return {"history": [dict(r) for r in rows]}
    except Exception:
        return {"history": []}
    finally:
        conn.close()

@router.get("/smoke-test")
def run_smoke_test_sample(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Dry-run verification across sample features from each tier.
    """
    test_ids = [1, 25, 41, 101, 111, 141, 201, 250, 301, 350, 401, 441, 501, 551, 600]
    results = []
    ws_id = current_user.get("workspace_id") or 1
    for fid in test_ids:
        r = UniversalFeatureExecutor.execute(fid, workspace_id=ws_id, dry_run=True)
        results.append({
            "feature_id": fid,
            "feature_name": r.get("feature_name", f"Feature #{fid}"),
            "status": r.get("status", "ready"),
            "group": r.get("group", "Standard")
        })
    return {
        "audited_count": len(results),
        "results": results
    }
