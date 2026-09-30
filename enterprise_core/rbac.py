import streamlit as st
from functools import wraps

def require_role(allowed_roles):
    """
    Decorator to enforce Role-Based Access Control (RBAC).
    Admin, Manager, User, Viewer
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            user_role = st.session_state.get("user_role", "Viewer")
            if user_role not in allowed_roles:
                st.error(f"Access Denied. Your current role ({user_role}) does not have permission to execute this action. Required: {', '.join(allowed_roles)}.")
                st.stop()
            return func(*args, **kwargs)
        return wrapper
    return decorator

def set_current_role(role: str):
    st.session_state["user_role"] = role
