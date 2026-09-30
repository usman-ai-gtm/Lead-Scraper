# UI Components
import streamlit as st

def render_empty_state(title: str, description: str, icon: str = "📁"):
    st.markdown(f"""
        <div style="text-align: center; padding: 60px 20px; background: var(--surface); border: 1px dashed var(--border); border-radius: var(--radius-lg); margin: 20px 0;">
            <div style="font-size: 3rem; margin-bottom: 20px; color: var(--text-muted);">{icon}</div>
            <h3 style="color: var(--text-primary); margin-bottom: 10px;">{title}</h3>
            <p style="color: var(--text-secondary);">{description}</p>
        </div>
    """, unsafe_allow_html=True)

def render_status_badge(status: str, variant: str = "info"):
    colors = {
        "success": ("#10b981", "rgba(16, 185, 129, 0.1)"),
        "warning": ("#f59e0b", "rgba(245, 158, 11, 0.1)"),
        "danger": ("#ef4444", "rgba(239, 68, 68, 0.1)"),
        "info": ("#3b82f6", "rgba(59, 130, 246, 0.1)")
    }
    color, bg = colors.get(variant, colors["info"])
    return f'<span style="background: {bg}; color: {color}; padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; border: 1px solid {color}33;">{status}</span>'
