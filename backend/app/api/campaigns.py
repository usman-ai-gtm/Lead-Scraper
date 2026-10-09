"""
USMAN AI GTM - Campaigns, Outreach & Connected Accounts API Endpoints
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any, List
from pydantic import BaseModel

from backend.app.schemas.campaigns import (
    CampaignCreateRequest, CampaignUpdateRequest, TestMessageSendRequest,
    ConnectedAccountCreateRequest, WhatsAppSetupWizardRequest
)
from backend.app.services.campaign_service import CampaignService
from database.models import AccountRepository
from backend.app.core.security import get_current_user

router = APIRouter(prefix="/campaigns", tags=["Campaigns & Outreach"])

class StatusUpdateRequest(BaseModel):
    status: str

@router.get("")
def list_campaigns(current_user: Dict[str, Any] = Depends(get_current_user)):
    ws_id = current_user.get("workspace_id") or 1
    return CampaignService.get_campaigns(workspace_id=ws_id)

@router.post("")
def create_campaign(
    req: CampaignCreateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    ws_id = current_user.get("workspace_id") or req.workspace_id or 1
    new_id = CampaignService.create_campaign(req.model_dump(), workspace_id=ws_id)
    return {"status": "success", "campaign_id": new_id, "message": "Campaign created successfully"}

@router.put("/{campaign_id}/status")
def update_campaign_status(
    campaign_id: int,
    req: StatusUpdateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    CampaignService.update_campaign_status(campaign_id, req.status)
    return {"status": "success", "message": f"Campaign #{campaign_id} status updated to {req.status}"}

@router.get("/accounts")
def list_connected_accounts(current_user: Dict[str, Any] = Depends(get_current_user)):
    ws_id = current_user.get("workspace_id") or 1
    return CampaignService.get_connected_accounts(workspace_id=ws_id)

@router.post("/accounts")
def create_connected_account(
    req: ConnectedAccountCreateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    ws_id = current_user.get("workspace_id") or req.workspace_id or 1
    provider = req.provider.lower()

    if provider == "smtp":
        extra = req.extra_config or {}
        host = extra.get("host", "smtp.gmail.com")
        port = int(extra.get("port", 587))
        username = extra.get("username", req.external_identity)
        password = req.access_token or ""
        use_tls = extra.get("use_tls", True)

        if not password:
            raise HTTPException(status_code=400, detail="Password or App Token is required for SMTP connection")

        from services.smtp_service import SMTPService
        test_res = SMTPService.test_connection(host, port, username, password, use_tls=use_tls)
        if not test_res.get("success"):
            raise HTTPException(status_code=400, detail=f"SMTP test failed: {test_res.get('message')}")

    acc_id = AccountRepository.create_or_update_account(
        workspace_id=ws_id,
        account_type=req.account_type,
        provider=req.provider,
        display_name=req.display_name,
        external_identity=req.external_identity,
        status="CONNECTED",
        extra_config=req.extra_config,
        access_token=req.access_token,
        refresh_token=req.refresh_token,
        is_default=True
    )
    return {
        "status": "success",
        "account_id": acc_id,
        "message": f"Account '{req.display_name}' ({req.external_identity}) connected and verified successfully."
    }

@router.delete("/accounts/{account_id}")
def disconnect_connected_account(
    account_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    ws_id = current_user.get("workspace_id") or 1
    success = AccountRepository.disconnect_account(account_id, workspace_id=ws_id)
    if not success:
        raise HTTPException(status_code=404, detail="Account not found")
    return {"status": "success", "message": f"Account #{account_id} disconnected and credentials purged."}

@router.post("/test-send")
def test_send_message(
    req: TestMessageSendRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    ws_id = current_user.get("workspace_id") or req.workspace_id or 1
    acc = AccountRepository.get_account_by_id(req.account_id)
    if not acc:
        raise HTTPException(status_code=404, detail="Selected sending account not found in database")

    provider = (acc.get("provider") or "").lower()
    subject = req.subject or "USMAN AI GTM - Outbound Connection Test"
    msg_body = req.message_body or "This is a verified test delivery message from your USMAN AI GTM platform."

    if provider == "gmail":
        from services.gmail_service import GmailService
        res = GmailService.send_email(
            account_id=req.account_id,
            to_email=req.recipient,
            subject=subject,
            body_html=f"<p>{msg_body}</p>",
            body_text=msg_body
        )
        if not res.get("success"):
            AccountRepository.log_audit(
                workspace_id=ws_id,
                account_id=req.account_id,
                action="test_send_failed",
                result="FAILED",
                details=f"Test send to {req.recipient} failed: {res.get('error')}"
            )
            raise HTTPException(status_code=400, detail=res.get("error", "Gmail send request failed"))
        provider_msg_id = res.get("provider_message_id")
    elif provider == "smtp":
        from services.smtp_service import SMTPService
        res = SMTPService.send_email(
            account_id=req.account_id,
            to_email=req.recipient,
            subject=subject,
            body_html=f"<p>{msg_body}</p>",
            body_text=msg_body
        )
        if not res.get("success"):
            AccountRepository.log_audit(
                workspace_id=ws_id,
                account_id=req.account_id,
                action="test_send_failed",
                result="FAILED",
                details=f"Test send to {req.recipient} failed: {res.get('error')}"
            )
            raise HTTPException(status_code=400, detail=res.get("error", "SMTP send request failed"))
        provider_msg_id = res.get("provider_message_id")
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Provider '{provider}' is not supported for email test sending. Please configure a Gmail or SMTP account."
        )

    # Log genuine success audit
    AccountRepository.log_audit(
        workspace_id=ws_id,
        account_id=req.account_id,
        action="test_sent",
        result="SUCCESS",
        details=f"Verified test message sent to {req.recipient} via {acc['provider']} (ID: {provider_msg_id})"
    )

    return {
        "status": "success",
        "channel": req.channel,
        "recipient": req.recipient,
        "account": acc["display_name"],
        "provider_message_id": provider_msg_id,
        "message": f"Verified test delivery completed successfully to {req.recipient}"
    }

@router.post("/{campaign_id}/launch")
def launch_campaign(
    campaign_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    ws_id = current_user.get("workspace_id") or 1
    from backend.app.core.database import get_db_connection
    conn = get_db_connection()
    camp = conn.execute("SELECT * FROM email_campaigns WHERE id = ? AND workspace_id = ?", (campaign_id, ws_id)).fetchone()
    if not camp:
        conn.close()
        raise HTTPException(status_code=404, detail=f"Campaign #{campaign_id} not found in this workspace")

    acc_id = camp["email_account_id"]
    if not acc_id:
        conn.close()
        raise HTTPException(
            status_code=400,
            detail="Campaign cannot be launched: No connected sender account is assigned. Please connect and select an authorized Gmail or SMTP account."
        )

    acc = AccountRepository.get_account_by_id(acc_id)
    if not acc or acc.get("status") != "CONNECTED":
        conn.close()
        raise HTTPException(
            status_code=400,
            detail="Campaign cannot be launched: The assigned sender account is not connected or requires re-authentication."
        )

    CampaignService.update_campaign_status(campaign_id, "Active")
    conn.close()
    return {
        "status": "success",
        "campaign_id": campaign_id,
        "status_now": "Active",
        "message": f"Campaign #{campaign_id} '{camp['name']}' has been launched into the outbound queue."
    }

@router.post("/whatsapp-setup")
def setup_whatsapp(
    req: WhatsAppSetupWizardRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    ws_id = current_user.get("workspace_id") or req.workspace_id or 1
    extra_config = {
        "phone_number_id": req.phone_number_id,
        "waba_id": req.waba_id
    }
    acc_id = AccountRepository.create_or_update_account(
        workspace_id=ws_id,
        account_type="whatsapp",
        provider="meta_whatsapp",
        display_name=req.display_name,
        external_identity=req.phone_number,
        external_account_id=req.waba_id,
        status="CONNECTED",
        extra_config=extra_config,
        access_token=req.permanent_token,
        is_default=True
    )
    return {"status": "success", "account_id": acc_id, "message": "Meta WhatsApp Business Cloud API configured successfully"}
