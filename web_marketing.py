import streamlit as st

def render_navigation():
    st.markdown("""
        <div class="nav-header">
            <a href="#" class="nav-logo">
                USMAN <span>AI GTM</span>
            </a>
            <div class="nav-links">
                <a href="#platform">Platform</a>
                <a href="#features">Features</a>
                <a href="#solutions">Solutions</a>
                <a href="#pricing">Pricing</a>
                <a href="#resources">Resources</a>
            </div>
            <div style="display: flex; gap: 15px;">
                <a href="#" class="nav-links" style="color: white; text-decoration: none; padding: 8px 15px; font-weight: 500;">Login</a>
                <a href="#" style="background: var(--accent-gradient); color: white; text-decoration: none; padding: 8px 20px; border-radius: 30px; font-weight: 600; box-shadow: var(--shadow-glow);">Start Free</a>
            </div>
        </div>
    """, unsafe_allow_html=True)

def render_hero():
    st.markdown("""
        <div class="hero-wrapper">
            <div class="hero-bg-glow"></div>
            <span class="eyebrow">AI-POWERED B2B GROWTH PLATFORM</span>
            <h1 class="hero-title">Find. Engage. Convert. <span class="text-gradient">Grow.</span></h1>
            <p class="hero-subtitle">
                The ultimate AI-native B2B Revenue Operations platform. Harness the power of 29 AI models to discover high-intent leads, automate personalized omnichannel outreach, and close deals at scale.
            </p>
        </div>
    """, unsafe_allow_html=True)

    col1, col2, col3 = st.columns([1, 2, 1])
    with col2:
        if st.button("🚀 Access Dashboard (Login)", type="primary", use_container_width=True):
            st.session_state["app_state"] = "authenticated"
            st.rerun()
            
    st.markdown("<div style='height: 40px;'></div>", unsafe_allow_html=True)
    
    # Fake UI Preview / Dashboard Mockup
    st.markdown("""
        <div class="container-center">
            <div style="background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 10px; box-shadow: var(--shadow-lg);">
                <div style="display: flex; gap: 10px; padding: 10px; border-bottom: 1px solid var(--border); margin-bottom: 20px;">
                    <div style="width: 12px; height: 12px; border-radius: 50%; background: #ef4444;"></div>
                    <div style="width: 12px; height: 12px; border-radius: 50%; background: #f59e0b;"></div>
                    <div style="width: 12px; height: 12px; border-radius: 50%; background: #10b981;"></div>
                </div>
                <div style="display: grid; grid-template-columns: 250px 1fr; gap: 20px; height: 400px;">
                    <div style="background: var(--bg-secondary); border-radius: var(--radius-md); border: 1px solid var(--border); padding: 20px;">
                        <div style="height: 20px; width: 60%; background: var(--surface-hover); border-radius: 4px; margin-bottom: 20px;"></div>
                        <div style="height: 15px; width: 80%; background: var(--surface); border-radius: 4px; margin-bottom: 15px;"></div>
                        <div style="height: 15px; width: 70%; background: var(--surface); border-radius: 4px; margin-bottom: 15px;"></div>
                        <div style="height: 15px; width: 90%; background: var(--surface); border-radius: 4px; margin-bottom: 15px;"></div>
                    </div>
                    <div style="display: grid; grid-template-rows: auto 1fr; gap: 20px;">
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;">
                            <div style="background: var(--surface-hover); border-radius: var(--radius-md); padding: 20px; border: 1px solid var(--border);">
                                <div style="font-size: 24px; font-weight: bold; color: var(--accent-cyan); margin-bottom: 5px;">24,592</div>
                                <div style="font-size: 12px; color: var(--text-secondary);">Leads Discovered</div>
                            </div>
                            <div style="background: var(--surface-hover); border-radius: var(--radius-md); padding: 20px; border: 1px solid var(--border);">
                                <div style="font-size: 24px; font-weight: bold; color: #10b981; margin-bottom: 5px;">98.4%</div>
                                <div style="font-size: 12px; color: var(--text-secondary);">Data Accuracy</div>
                            </div>
                            <div style="background: var(--surface-hover); border-radius: var(--radius-md); padding: 20px; border: 1px solid var(--border);">
                                <div style="font-size: 24px; font-weight: bold; color: #8b5cf6; margin-bottom: 5px;">42.1%</div>
                                <div style="font-size: 12px; color: var(--text-secondary);">Reply Rate</div>
                            </div>
                        </div>
                        <div style="background: var(--bg-secondary); border-radius: var(--radius-md); border: 1px solid var(--border); position: relative; overflow: hidden;">
                            <div style="position: absolute; bottom: 0; left: 0; right: 0; height: 150px; background: linear-gradient(0deg, rgba(59,130,246,0.2) 0%, transparent 100%);"></div>
                            <svg viewBox="0 0 100 40" style="width: 100%; height: 100%; preserveAspectRatio: none;">
                                <path d="M0,35 Q10,25 20,30 T40,20 T60,25 T80,10 T100,5 L100,40 L0,40 Z" fill="rgba(59,130,246,0.2)" stroke="var(--accent-primary)" stroke-width="0.5"/>
                            </svg>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    """, unsafe_allow_html=True)

def render_statistics():
    st.markdown("""
        <div class="stats-container">
            <div class="stat-item">
                <div class="stat-value">29</div>
                <div class="stat-label">AI Models Integrated</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">600+</div>
                <div class="stat-label">Enterprise Features</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">100%</div>
                <div class="stat-label">Data Validation</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">10x</div>
                <div class="stat-label">Pipeline Growth</div>
            </div>
        </div>
    """, unsafe_allow_html=True)

def render_capabilities():
    st.markdown("""
        <div class="container-center section-spacing" id="features">
            <span class="eyebrow text-center">CORE CAPABILITIES</span>
            <h2 class="text-center" style="font-size: 2.5rem; margin-bottom: 3rem;">Everything you need to scale revenue.</h2>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 30px;">
                <div class="premium-card">
                    <span class="premium-card-icon">🎯</span>
                    <h3 class="premium-card-title">Ultra Lead Discovery</h3>
                    <p class="premium-card-text">Concurrent multi-platform orchestration sweeping Google, LinkedIn, Maps, and specialized directories to find your exact ICP.</p>
                </div>
                <div class="premium-card">
                    <span class="premium-card-icon">🧠</span>
                    <h3 class="premium-card-title">Multi-AI Consensus</h3>
                    <p class="premium-card-text">29 LLMs working in parallel to score leads, detect buying intent, and craft highly personalized omnichannel messaging.</p>
                </div>
                <div class="premium-card">
                    <span class="premium-card-icon">⚡</span>
                    <h3 class="premium-card-title">Omnichannel Automation</h3>
                    <p class="premium-card-text">Integrated Cold Email sequences, Official WhatsApp Cloud API, and a 10-stage visual CRM pipeline to drive revenue automatically.</p>
                </div>
                <div class="premium-card">
                    <span class="premium-card-icon">🔍</span>
                    <h3 class="premium-card-title">Deep Data Enrichment</h3>
                    <p class="premium-card-text">Automatically resolve missing fields, verify emails, detect technologies, and map the buying committee for target accounts.</p>
                </div>
                <div class="premium-card">
                    <span class="premium-card-icon">📈</span>
                    <h3 class="premium-card-title">Revenue Intelligence</h3>
                    <p class="premium-card-text">Forecast sales, track conversion velocity, and get AI-driven strategic account briefs to close enterprise deals faster.</p>
                </div>
                <div class="premium-card">
                    <span class="premium-card-icon">🛡️</span>
                    <h3 class="premium-card-title">Enterprise Security</h3>
                    <p class="premium-card-text">Built-in RBAC, compliance reporting, DSR portal, and API health monitoring to ensure your data stays secure and compliant.</p>
                </div>
            </div>
        </div>
    """, unsafe_allow_html=True)

def render_showcase():
    st.markdown("""
        <div class="container-center section-spacing" id="platform">
            <span class="eyebrow text-center">PLATFORM SHOWCASE</span>
            <h2 class="text-center" style="font-size: 2.5rem; margin-bottom: 5rem;">A new standard for B2B Sales.</h2>
            
            <div class="showcase-row">
                <div class="showcase-content">
                    <span class="eyebrow">INTELLIGENCE</span>
                    <h3 style="font-size: 2rem; margin-bottom: 1rem;">Uncover hidden buying signals.</h3>
                    <p class="premium-card-text" style="margin-bottom: 2rem;">Our multi-agent consensus engine analyzes news, website changes, and job postings to detect buying intent before your competitors do.</p>
                    <ul style="list-style: none; padding: 0; color: var(--text-secondary);">
                        <li style="margin-bottom: 10px;">✓ Multi-model consensus scoring</li>
                        <li style="margin-bottom: 10px;">✓ Funding & executive change triggers</li>
                        <li style="margin-bottom: 10px;">✓ Technology adoption signals</li>
                    </ul>
                </div>
                <div class="showcase-visual">
                    <div style="height: 300px; background: url('https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80') center/cover; opacity: 0.7;"></div>
                </div>
            </div>
            
            <div class="showcase-row">
                <div class="showcase-content">
                    <span class="eyebrow">AUTOMATION</span>
                    <h3 style="font-size: 2rem; margin-bottom: 1rem;">Omnichannel outreach that converts.</h3>
                    <p class="premium-card-text" style="margin-bottom: 2rem;">Stop manually writing emails. Let AI craft hyper-personalized messages and orchestrate campaigns across Email and WhatsApp.</p>
                    <ul style="list-style: none; padding: 0; color: var(--text-secondary);">
                        <li style="margin-bottom: 10px;">✓ AI Copywriting Agent</li>
                        <li style="margin-bottom: 10px;">✓ Official WhatsApp Cloud API</li>
                        <li style="margin-bottom: 10px;">✓ Automated sequence throttling</li>
                    </ul>
                </div>
                <div class="showcase-visual">
                    <div style="height: 300px; background: url('https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80') center/cover; opacity: 0.7;"></div>
                </div>
            </div>
            
        </div>
    """, unsafe_allow_html=True)

def render_workflow():
    st.markdown("""
        <div style="background: var(--surface); padding: 80px 0; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border);">
            <div class="container-center text-center">
                <span class="eyebrow">HOW IT WORKS</span>
                <h2 style="font-size: 2.5rem; margin-bottom: 4rem;">The seamless GTM pipeline.</h2>
                
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px;">
                    <div style="background: var(--bg-tertiary); border: 1px solid var(--accent-primary); border-radius: var(--radius-full); padding: 10px 30px; font-weight: 600; box-shadow: var(--shadow-glow);">1. Discover</div>
                    <div style="color: var(--text-muted);">→</div>
                    <div style="background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: var(--radius-full); padding: 10px 30px; font-weight: 600;">2. Enrich</div>
                    <div style="color: var(--text-muted);">→</div>
                    <div style="background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: var(--radius-full); padding: 10px 30px; font-weight: 600;">3. Score</div>
                    <div style="color: var(--text-muted);">→</div>
                    <div style="background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: var(--radius-full); padding: 10px 30px; font-weight: 600;">4. Engage</div>
                    <div style="color: var(--text-muted);">→</div>
                    <div style="background: var(--bg-tertiary); border: 1px solid var(--accent-secondary); border-radius: var(--radius-full); padding: 10px 30px; font-weight: 600; box-shadow: 0 0 15px rgba(99, 102, 241, 0.3);">5. Close</div>
                </div>
            </div>
        </div>
    """, unsafe_allow_html=True)

def render_pricing():
    st.markdown("""
        <div class="container-center section-spacing" id="pricing">
            <span class="eyebrow text-center">PRICING</span>
            <h2 class="text-center" style="font-size: 2.5rem; margin-bottom: 4rem;">Simple, Transparent Plans.</h2>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 30px; max-width: 1000px; margin: 0 auto;">
                <div class="pricing-card">
                    <h3 style="color: var(--text-primary); font-size: 1.5rem;">Growth</h3>
                    <div class="pricing-price">$999<span>/mo</span></div>
                    <p style="color: var(--text-secondary); margin-bottom: 2rem;">Perfect for scaling teams starting with AI sales.</p>
                    <ul class="pricing-features">
                        <li>5,000 AI Lead Discoveries</li>
                        <li>Standard Email Sequences</li>
                        <li>Basic CRM Pipeline</li>
                        <li>5 Team Members</li>
                    </ul>
                    <a href="#" style="display: block; text-align: center; padding: 15px; border-radius: var(--radius-full); border: 1px solid var(--border); color: white; text-decoration: none; font-weight: 600; transition: var(--transition-base);">Start 14-Day Trial</a>
                </div>
                
                <div class="pricing-card popular">
                    <h3 style="color: var(--accent-cyan); font-size: 1.5rem;">Scale</h3>
                    <div class="pricing-price">$2,499<span>/mo</span></div>
                    <p style="color: var(--text-secondary); margin-bottom: 2rem;">Full omnichannel orchestration for serious teams.</p>
                    <ul class="pricing-features">
                        <li>25,000 AI Lead Discoveries</li>
                        <li>WhatsApp Cloud API Integration</li>
                        <li>Multi-AI Intent Detection</li>
                        <li>15 Team Members</li>
                    </ul>
                    <a href="#" style="display: block; text-align: center; padding: 15px; border-radius: var(--radius-full); background: var(--accent-gradient); color: white; text-decoration: none; font-weight: 600; transition: var(--transition-base); box-shadow: var(--shadow-glow);">Get Started</a>
                </div>
                
                <div class="pricing-card">
                    <h3 style="color: var(--text-primary); font-size: 1.5rem;">Enterprise</h3>
                    <div class="pricing-price">Custom</div>
                    <p style="color: var(--text-secondary); margin-bottom: 2rem;">Dedicated infrastructure and limitless scale.</p>
                    <ul class="pricing-features">
                        <li>Unlimited Discoveries</li>
                        <li>Custom Provider Hosting</li>
                        <li>Dedicated Account Manager</li>
                        <li>SLA & Compliance Reporting</li>
                    </ul>
                    <a href="#" style="display: block; text-align: center; padding: 15px; border-radius: var(--radius-full); border: 1px solid var(--border); color: white; text-decoration: none; font-weight: 600; transition: var(--transition-base);">Contact Sales</a>
                </div>
            </div>
        </div>
    """, unsafe_allow_html=True)

def render_footer():
    st.markdown("""
        <footer class="site-footer">
            <div class="footer-grid">
                <div class="footer-brand">
                    <div class="nav-logo">USMAN <span>AI GTM</span></div>
                    <p>The ultimate AI-native B2B Revenue Operations platform. Transforming the way modern enterprises find, engage, and convert leads.</p>
                </div>
                <div class="footer-col">
                    <h4>Platform</h4>
                    <ul>
                        <li><a href="#">Lead Discovery</a></li>
                        <li><a href="#">AI Consensus</a></li>
                        <li><a href="#">Omnichannel</a></li>
                        <li><a href="#">CRM Pipeline</a></li>
                    </ul>
                </div>
                <div class="footer-col">
                    <h4>Solutions</h4>
                    <ul>
                        <li><a href="#">For Startups</a></li>
                        <li><a href="#">For Agencies</a></li>
                        <li><a href="#">For Enterprise</a></li>
                        <li><a href="#">Revenue Ops</a></li>
                    </ul>
                </div>
                <div class="footer-col">
                    <h4>Resources</h4>
                    <ul>
                        <li><a href="#">Documentation</a></li>
                        <li><a href="#">API Reference</a></li>
                        <li><a href="#">Blog</a></li>
                        <li><a href="#">Community</a></li>
                    </ul>
                </div>
                <div class="footer-col">
                    <h4>Legal</h4>
                    <ul>
                        <li><a href="#">Privacy Policy</a></li>
                        <li><a href="#">Terms of Service</a></li>
                        <li><a href="#">Security</a></li>
                        <li><a href="#">DSR Portal</a></li>
                    </ul>
                </div>
            </div>
            <div class="footer-bottom">
                <div>© 2026 USMAN AI GTM. All rights reserved.</div>
                <div>Designed with ❤️ for Enterprise B2B.</div>
            </div>
        </footer>
        
        <!-- Floating WhatsApp Button -->
        <a href="#" class="whatsapp-float" target="_blank" title="Contact us on WhatsApp">
            <svg viewBox="0 0 32 32" width="32" height="32" fill="currentColor">
                <path d="M16 2.5A13.5 13.5 0 002.5 16a13.43 13.43 0 001.8 6.74L2 29.5l6.95-2.26A13.43 13.43 0 0016 29.5a13.5 13.5 0 0013.5-13.5A13.5 13.5 0 0016 2.5zm0 24.75a11.2 11.2 0 01-5.7-1.55l-.4-.24-4.24 1.38 1.4-4.14-.27-.42A11.2 11.2 0 1116 27.25z"/>
                <path d="M21.5 18.8c-.3-.15-1.78-.88-2.05-.98-.28-.1-.48-.15-.68.15s-.78.98-.95 1.18c-.18.2-.35.23-.65.08A8.25 8.25 0 0114.7 17a9.16 9.16 0 01-1.7-2.13c-.17-.3-.02-.45.13-.6.13-.13.3-.35.45-.53.15-.17.2-.3.3-.5s-.05-.38-.13-.53c-.08-.15-.68-1.63-.93-2.23-.25-.58-.5-.5-.68-.5h-.58c-.2 0-.53.08-.8.38S9.3 11.5 9.3 12.8s1.6 2.58 1.83 2.88 1.95 2.98 4.73 4.15c.65.28 1.18.45 1.58.58.68.2 1.3.18 1.78.1.55-.08 1.78-.73 2.03-1.43s.25-1.3.18-1.43c-.08-.1-.28-.15-.58-.3z"/>
            </svg>
        </a>
    """, unsafe_allow_html=True)

def render_connected_channels_section():
    st.markdown("""
        <div class="container-center section-spacing" id="integrations">
            <span class="eyebrow text-center">OMNICHANNEL INFRASTRUCTURE</span>
            <h2 class="text-center" style="font-size: 2.5rem; margin-bottom: 1rem;">Connect the channels your team already uses.</h2>
            <p class="text-center" style="color: var(--text-secondary); max-width: 650px; margin: 0 auto 3.5rem auto;">
                Authenticate unlimited communication lines with zero disruption. Enterprise-grade OAuth 2.0 and official Meta Cloud API protocols ensure maximum deliverability and compliance.
            </p>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 24px;">
                <div class="premium-card text-center" style="padding: 30px 20px;">
                    <div style="font-size: 2.5rem; margin-bottom: 15px;">🔴</div>
                    <h3 style="font-size: 1.25rem; margin-bottom: 8px;">Google Gmail</h3>
                    <p style="color: var(--text-secondary); font-size: 0.88rem; line-height: 1.5; margin-bottom: 15px;">
                        Official OAuth 2.0 authorization. Connect multiple Google Workspace accounts with zero password sharing.
                    </p>
                    <span class="status-badge connected-badge">Official OAuth 2.0</span>
                </div>
                
                <div class="premium-card text-center" style="padding: 30px 20px;">
                    <div style="font-size: 2.5rem; margin-bottom: 15px;">🟢</div>
                    <h3 style="font-size: 1.25rem; margin-bottom: 8px;">WhatsApp Business</h3>
                    <p style="color: var(--text-secondary); font-size: 0.88rem; line-height: 1.5; margin-bottom: 15px;">
                        Official Meta Cloud API. Verified phone numbers, approved interactive templates, and 2-way live sync.
                    </p>
                    <span class="status-badge connected-badge">Meta Verified</span>
                </div>
                
                <div class="premium-card text-center" style="padding: 30px 20px;">
                    <div style="font-size: 2.5rem; margin-bottom: 15px;">🔵</div>
                    <h3 style="font-size: 1.25rem; margin-bottom: 8px;">Microsoft 365</h3>
                    <p style="color: var(--text-secondary); font-size: 0.88rem; line-height: 1.5; margin-bottom: 15px;">
                        Native Azure Active Directory and Outlook Graph API integration for enterprise mailboxes.
                    </p>
                    <span class="status-badge connected-badge">Azure AD</span>
                </div>
                
                <div class="premium-card text-center" style="padding: 30px 20px;">
                    <div style="font-size: 2.5rem; margin-bottom: 15px;">✉️</div>
                    <h3 style="font-size: 1.25rem; margin-bottom: 8px;">Authorized SMTP</h3>
                    <p style="color: var(--text-secondary); font-size: 0.88rem; line-height: 1.5; margin-bottom: 15px;">
                        Connect SendGrid, Amazon SES, Mailgun, or private corporate mail relays with TLS/SSL encryption.
                    </p>
                    <span class="status-badge connected-badge">TLS Encrypted</span>
                </div>
            </div>
            
            <div style="text-align: center; margin-top: 3.5rem;">
                <div style="display: inline-block;">
                    <span style="color: var(--text-secondary); margin-right: 15px; font-size: 0.95rem;">Ready to scale authenticated outreach?</span>
                </div>
            </div>
        </div>
    """, unsafe_allow_html=True)
    
    col_a, col_b, col_c = st.columns([1, 1, 1])
    with col_b:
        if st.button("🔗 Connect Your Accounts", key="pub_connect_acc_btn", type="primary", use_container_width=True):
            st.session_state["app_state"] = "authenticated"
            st.session_state["premium_menu_default"] = "🔗 Connected Accounts Center"
            st.rerun()

def render_public_website():
    render_navigation()
    render_hero()
    render_statistics()
    render_capabilities()
    render_connected_channels_section()
    render_workflow()
    render_showcase()
    render_pricing()
    render_footer()

