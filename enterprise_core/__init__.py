"""
USMAN DATA ANALYTICS - ENTERPRISE CORE PACKAGE
Ultra Pro Max Enterprise Architecture Initialization.
"""

from enterprise_core.schema import (
    init_enterprise_schema,
    get_enterprise_db_connection
)
from enterprise_core.search_orchestrator import (
    EnterpriseSearchOrchestrator,
    SEARCH_MODES,
    QueryIntelligenceEngine,
    DeepWebsiteIntelligence,
    LeadDeduplicationOrchestrator
)
from enterprise_core.intelligence_engine import (
    EnterpriseLeadIntelligenceEngine
)
from enterprise_core.email_system import (
    EnterpriseEmailEngine,
    EmailDeliverabilityDiagnostics,
    EmailVariableRenderer,
    AIReplyIntelligenceEngine,
    CAMPAIGN_STATUSES,
    SUPPORTED_VARIABLES
)
from enterprise_core.whatsapp_system import (
    EnterpriseWhatsAppManager,
    WhatsAppCloudAPIClient
)
from enterprise_core.omnichannel_crm import (
    EnterpriseCRMManager,
    UnifiedOmnichannelTimeline,
    SalesAutomationWorkflowEngine,
    DEAL_STAGES,
    STAGE_PROBABILITIES
)
from enterprise_core.revenue_cs_enablement import (
    RevenueIntelligenceEngine,
    CustomerSuccessManager,
    SalesEnablementSuite,
    ABMOrchestrator
)
from enterprise_core.security_compliance import (
    EnterpriseAuditLogger,
    ComplianceManager,
    NotificationAlertCenter,
    ROLE_PERMISSIONS
)
from enterprise_core.copilot_integrations import (
    AISalesCopilot,
    UniversalGlobalSearch,
    SystemObservabilityCenter
)
from enterprise_core.ui_views import (
    render_executive_command_center,
    render_ultra_search_orchestrator,
    render_lead_intelligence_studio,
    render_cold_email_command_center,
    render_whatsapp_command_center,
    render_enterprise_crm,
    render_omnichannel_automation,
    render_revenue_intelligence,
    render_customer_success,
    render_sales_enablement,
    render_abm_studio,
    render_integration_hub,
    render_compliance_and_audit,
    render_copilot_and_global_search
)

__all__ = [
    "init_enterprise_schema",
    "get_enterprise_db_connection",
    "EnterpriseSearchOrchestrator",
    "SEARCH_MODES",
    "QueryIntelligenceEngine",
    "DeepWebsiteIntelligence",
    "LeadDeduplicationOrchestrator",
    "EnterpriseLeadIntelligenceEngine",
    "EnterpriseEmailEngine",
    "EmailDeliverabilityDiagnostics",
    "EmailVariableRenderer",
    "AIReplyIntelligenceEngine",
    "CAMPAIGN_STATUSES",
    "SUPPORTED_VARIABLES",
    "EnterpriseWhatsAppManager",
    "WhatsAppCloudAPIClient",
    "EnterpriseCRMManager",
    "UnifiedOmnichannelTimeline",
    "SalesAutomationWorkflowEngine",
    "DEAL_STAGES",
    "STAGE_PROBABILITIES",
    "RevenueIntelligenceEngine",
    "CustomerSuccessManager",
    "SalesEnablementSuite",
    "ABMOrchestrator",
    "EnterpriseAuditLogger",
    "ComplianceManager",
    "NotificationAlertCenter",
    "ROLE_PERMISSIONS",
    "AISalesCopilot",
    "UniversalGlobalSearch",
    "SystemObservabilityCenter",
    "render_executive_command_center",
    "render_ultra_search_orchestrator",
    "render_lead_intelligence_studio",
    "render_cold_email_command_center",
    "render_whatsapp_command_center",
    "render_enterprise_crm",
    "render_omnichannel_automation",
    "render_revenue_intelligence",
    "render_customer_success",
    "render_sales_enablement",
    "render_abm_studio",
    "render_integration_hub",
    "render_compliance_and_audit",
    "render_copilot_and_global_search"
]
