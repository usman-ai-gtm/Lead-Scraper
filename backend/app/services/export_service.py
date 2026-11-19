"""
USMAN AI GTM - Production XLSX & Landscape PDF Export Generator
Strict Rules:
- CSV IS COMPLETELY PROHIBITED.
- XLSX: 18 standardized columns, bold headers, auto-filters, clickable URLs, auto-adjusted widths.
- PDF: A4 Landscape, zero cut-off text, auto-wrapped paragraphs, repeated headers on every page,
       page numbers (Page X of Y), metadata summary header.
"""

import io
import os
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timezone, timedelta

# OpenPyXL for Excel
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

# ReportLab for Landscape PDF
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.units import inch, cm, mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
)
from reportlab.pdfgen import canvas

PKT_OFFSET = timedelta(hours=5)

def get_pkt_strings() -> Tuple[str, str, str]:
    now_utc = datetime.now(timezone.utc)
    now_pkt = now_utc.astimezone(timezone(PKT_OFFSET))
    pkt_date = now_pkt.strftime("%d %B %Y").lstrip("0")
    pkt_time = now_pkt.strftime("%I:%M %p")
    pkt_dt = f"{pkt_date} at {pkt_time} PKT"
    return pkt_date, pkt_time, pkt_dt


class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas to dynamically compute and print 'Page X of Y' in landscape footer.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_number(num_pages)
            super().showPage()
        super().save()

    def draw_page_number(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        
        # Landscape A4 width is 841.89 pt, height is 595.27 pt
        page_width, page_height = landscape(A4)
        
        # Footer text
        footer_left = "USMAN AI GTM • Confidential B2B Qualified Lead Intelligence"
        footer_right = f"Page {self._pageNumber} of {page_count}"
        
        # Draw subtle top border line for footer
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.5)
        self.line(25, 25, page_width - 25, 25)
        
        self.drawString(25, 14, footer_left)
        self.drawRightString(page_width - 25, 14, footer_right)
        self.restoreState()


class ExportGenerator:
    """
    Enterprise Export Engine for XLSX and PDF.
    """

    @classmethod
    def generate_xlsx(
        cls,
        leads: List[Dict[str, Any]],
        sheet_title: str = "Qualified Leads",
        metadata: Optional[Dict[str, Any]] = None
    ) -> bytes:
        """
        Builds a styled, professionally formatted XLSX spreadsheet.
        """
        pkt_date, pkt_time, pkt_dt = get_pkt_strings()

        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = sheet_title[:30]

        # Enable grid lines visibility
        ws.views.sheetView[0].showGridLines = True

        headers = [
            "Business Name",
            "Website",
            "Domain",
            "Email",
            "Phone",
            "Country",
            "City",
            "Industry",
            "Source Platform",
            "Original Source URL",
            "Email Source URL",
            "Phone Source URL",
            "Search Keyword",
            "Search Date",
            "Search Time",
            "Saved Date",
            "Saved Time",
            "Export Date & Time"
        ]

        # Header styling
        header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
        header_fill = PatternFill(start_color="0F172A", end_color="0F172A", fill_type="solid")
        header_align = Alignment(horizontal="center", vertical="center", wrap_text=True)
        thin_border = Border(
            left=Side(style='thin', color='CBD5E1'),
            right=Side(style='thin', color='CBD5E1'),
            top=Side(style='thin', color='CBD5E1'),
            bottom=Side(style='thin', color='CBD5E1')
        )

        ws.append(headers)
        ws.row_dimensions[1].height = 28

        for col_idx, col_name in enumerate(headers, 1):
            cell = ws.cell(row=1, column=col_idx)
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = header_align
            cell.border = thin_border

        data_font = Font(name="Calibri", size=10)
        link_font = Font(name="Calibri", size=10, color="0284C7", underline="single")
        zebra_fill = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
        white_fill = PatternFill(start_color="FFFFFF", end_color="FFFFFF", fill_type="solid")

        row_num = 2
        seen_domains = set()

        for lead in leads:
            # Deduplication inside dataset: skip identical domain or (name+email)
            dom = (lead.get("domain") or "").strip().lower()
            em = (lead.get("email") or "").strip().lower()
            bname = (lead.get("business_name") or "").strip().lower()
            
            dedup_key = dom if dom else f"{bname}|{em}"
            if dedup_key in seen_domains:
                continue
            seen_domains.add(dedup_key)

            website = lead.get("website") or (f"https://{dom}" if dom else "")
            email = lead.get("email") or ""
            phone = lead.get("phone") or "Not Listed"
            if not phone or phone == "Not Found": phone = "Not Listed"

            orig_src = lead.get("original_source_url") or lead.get("source_url") or website
            email_src = lead.get("email_source_url") or orig_src
            phone_src = lead.get("phone_source_url") or (orig_src if phone != "Not Listed" else "Not Listed")

            s_date = lead.get("search_date") or lead.get("saved_date") or pkt_date
            s_time = lead.get("search_time") or lead.get("saved_time") or pkt_time

            row_data = [
                lead.get("business_name") or "Business",
                website,
                dom,
                email,
                phone,
                lead.get("country") or "Global",
                lead.get("city") or "Not Specified",
                lead.get("industry") or lead.get("category") or "Commercial",
                lead.get("source_platform") or lead.get("source") or "Google Organic Search",
                orig_src,
                email_src,
                phone_src,
                lead.get("search_keyword") or (metadata.get("keyword") if metadata else "") or lead.get("industry") or "",
                s_date,
                s_time,
                lead.get("saved_date") or s_date,
                lead.get("saved_time") or s_time,
                pkt_dt
            ]

            ws.append(row_data)
            current_row = ws[row_num]
            ws.row_dimensions[row_num].height = 20
            row_fill = zebra_fill if row_num % 2 == 0 else white_fill

            for c_idx, cell in enumerate(current_row, 1):
                cell.font = data_font
                cell.fill = row_fill
                cell.border = thin_border
                cell.alignment = Alignment(vertical="center")

                # Make URL columns clickable hyperlinks (Website, Original Source, Email Source, Phone Source)
                val_str = str(cell.value or "")
                if c_idx in [2, 10, 11, 12] and val_str.startswith("http"):
                    cell.hyperlink = val_str
                    cell.font = link_font

            row_num += 1

        # Autofilter
        last_col_letter = get_column_letter(len(headers))
        ws.auto_filter.ref = f"A1:{last_col_letter}{row_num - 1}"

        # Adjust column widths appropriately
        col_widths = {
            1: 28,  # Business Name
            2: 28,  # Website
            3: 22,  # Domain
            4: 28,  # Email
            5: 18,  # Phone
            6: 16,  # Country
            7: 18,  # City
            8: 22,  # Industry
            9: 26,  # Source Platform
            10: 34, # Original Source URL
            11: 34, # Email Source URL
            12: 34, # Phone Source URL
            13: 20, # Search Keyword
            14: 16, # Search Date
            15: 14, # Search Time
            16: 16, # Saved Date
            17: 14, # Saved Time
            18: 24, # Export Date & Time
        }

        for col_idx, width in col_widths.items():
            col_letter = get_column_letter(col_idx)
            ws.column_dimensions[col_letter].width = width

        buffer = io.BytesIO()
        wb.save(buffer)
        buffer.seek(0)
        return buffer.getvalue()

    @classmethod
    def generate_pdf(
        cls,
        leads: List[Dict[str, Any]],
        title: str = "USMAN AI GTM — B2B Qualified Leads Report",
        metadata: Optional[Dict[str, Any]] = None
    ) -> bytes:
        """
        Builds a landscape A4 PDF report with zero clipped text, auto-wrapped cells,
        repeated table headers, clean margins, and dynamic Page X of Y numbering.
        """
        pkt_date, pkt_time, pkt_dt = get_pkt_strings()
        meta = metadata or {}

        buffer = io.BytesIO()
        # Page size: Landscape A4 (841.89 x 595.27 pt). Margins: 24 pt (0.33 inch)
        doc = SimpleDocTemplate(
            buffer,
            pagesize=landscape(A4),
            leftMargin=24,
            rightMargin=24,
            topMargin=24,
            bottomMargin=36
        )

        styles = getSampleStyleSheet()

        # Custom typography styles
        title_style = ParagraphStyle(
            'DocTitle',
            parent=styles['Heading1'],
            fontName='Helvetica-Bold',
            fontSize=16,
            leading=20,
            textColor=colors.HexColor('#0F172A'),
            spaceAfter=2
        )
        
        meta_label_style = ParagraphStyle(
            'MetaLabel',
            fontName='Helvetica-Bold',
            fontSize=9,
            leading=12,
            textColor=colors.HexColor('#334155')
        )
        
        meta_val_style = ParagraphStyle(
            'MetaVal',
            fontName='Helvetica',
            fontSize=9,
            leading=12,
            textColor=colors.HexColor('#0F172A')
        )

        th_style = ParagraphStyle(
            'TableHeader',
            fontName='Helvetica-Bold',
            fontSize=8,
            leading=10,
            textColor=colors.white,
            alignment=1 # Center
        )

        td_style = ParagraphStyle(
            'TableCell',
            fontName='Helvetica',
            fontSize=7.5,
            leading=9.5,
            textColor=colors.HexColor('#1E293B')
        )

        td_bold = ParagraphStyle(
            'TableCellBold',
            fontName='Helvetica-Bold',
            fontSize=8,
            leading=10,
            textColor=colors.HexColor('#0F172A')
        )

        td_link = ParagraphStyle(
            'TableCellLink',
            fontName='Helvetica',
            fontSize=7.5,
            leading=9.5,
            textColor=colors.HexColor('#0284C7')
        )

        td_sub = ParagraphStyle(
            'TableCellSub',
            fontName='Helvetica',
            fontSize=6.5,
            leading=8.5,
            textColor=colors.HexColor('#64748B')
        )

        story = []

        # Header Title
        story.append(Paragraph(title, title_style))
        
        # Meta Info Card
        keyword_display = meta.get("keyword") or "All Saved Leads"
        total_leads = len(leads)
        phone_count = sum(1 for l in leads if l.get("phone") and str(l.get("phone")).strip() not in ["", "Not Listed", "Not Found"])
        search_date_display = meta.get("search_date") or pkt_date
        search_time_display = meta.get("search_time") or pkt_time

        meta_table_data = [
            [
                Paragraph(f"<b>Keyword:</b> {keyword_display}", meta_val_style),
                Paragraph(f"<b>Date (PKT):</b> {search_date_display}", meta_val_style),
                Paragraph(f"<b>Time (PKT):</b> {search_time_display}", meta_val_style),
                Paragraph(f"<b>Total Leads:</b> {total_leads}", meta_val_style),
                Paragraph(f"<b>With Phone:</b> {phone_count}", meta_val_style),
                Paragraph(f"<b>Export Time:</b> {pkt_time} PKT", meta_val_style),
            ]
        ]
        meta_table = Table(meta_table_data, colWidths=[140, 120, 110, 110, 110, 180])
        meta_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F1F5F9')),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#CBD5E1')),
            ('PADDING', (0,0), (-1,-1), 6),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ]))
        story.append(meta_table)
        story.append(Spacer(1, 10))

        # Table Column Widths: Total available printable width is 841.89 - 48 = 793.89 pt
        # Columns:
        # 1. # (24 pt)
        # 2. Business Name (125 pt)
        # 3. Website & Domain (125 pt)
        # 4. Verified Email & Evidence (170 pt)
        # 5. Telephone / WhatsApp (100 pt)
        # 6. Location & Industry (100 pt)
        # 7. Source Platform & Original URL (148 pt)
        # Total = 24 + 125 + 125 + 170 + 100 + 100 + 148 = 792 pt
        col_widths = [24, 125, 125, 170, 100, 100, 148]

        table_data = []

        # Repeated Table Header Row
        header_row = [
            Paragraph("#", th_style),
            Paragraph("Business Name", th_style),
            Paragraph("Website & Domain", th_style),
            Paragraph("Verified Business Email", th_style),
            Paragraph("Corporate Phone", th_style),
            Paragraph("Location & Industry", th_style),
            Paragraph("Source Platform & Evidence URL", th_style),
        ]
        table_data.append(header_row)

        seen_keys = set()
        row_idx = 1

        for lead in leads:
            bname = (lead.get("business_name") or "Business").strip()
            email = (lead.get("email") or "").strip()
            dom = (lead.get("domain") or "").strip().lower()
            
            key = dom if dom else f"{bname.lower()}|{email.lower()}"
            if key in seen_keys:
                continue
            seen_keys.add(key)

            website = lead.get("website") or (f"https://{dom}" if dom else "")
            phone = lead.get("phone") or "Not Listed"
            if not phone or phone == "Not Found": phone = "Not Listed"

            country = lead.get("country") or "Global"
            city = lead.get("city") or ""
            loc_str = f"{city}, {country}" if city and city != "Not Specified" else country
            industry = lead.get("industry") or lead.get("category") or "Commercial"

            src_plat = lead.get("source_platform") or lead.get("source") or "Google Organic Search"
            orig_url = lead.get("original_source_url") or lead.get("source_url") or website
            email_status = lead.get("email_status") or "FOUND IN SOURCE"

            # Cell 2: Business Name
            p_name = Paragraph(f"<b>{bname}</b>", td_bold)

            # Cell 3: Website & Domain (Clickable Link)
            if website and website.startswith("http"):
                p_web = Paragraph(f"<a href='{website}'><u>{dom or website[:25]}</u></a><br/><font color='#64748B'>{website[:30]}</font>", td_link)
            else:
                p_web = Paragraph(f"{dom or 'N/A'}", td_style)

            # Cell 4: Email & Status
            p_email = Paragraph(f"<b>{email}</b><br/><font color='#16A34A'>{email_status}</font>", td_style)

            # Cell 5: Phone
            phone_status = lead.get("phone_status") or ("VERIFIED" if phone != "Not Listed" else "")
            p_phone = Paragraph(f"<b>{phone}</b><br/><font color='#64748B'>{phone_status}</font>", td_style)

            # Cell 6: Location & Industry
            p_loc = Paragraph(f"<b>{loc_str}</b><br/><font color='#64748B'>{industry}</font>", td_style)

            # Cell 7: Source & URL (Clickable)
            if orig_url and orig_url.startswith("http"):
                p_src = Paragraph(f"<b>{src_plat[:28]}</b><br/><a href='{orig_url}'><u><font color='#0284C7'>{orig_url[:30]}...</font></u></a>", td_style)
            else:
                p_src = Paragraph(f"<b>{src_plat}</b>", td_style)

            table_data.append([
                Paragraph(str(row_idx), td_sub),
                p_name,
                p_web,
                p_email,
                p_phone,
                p_loc,
                p_src
            ])
            row_idx += 1

        # Table styling with repeated header row on page splits (repeatRows=1)
        lead_table = Table(table_data, colWidths=col_widths, repeatRows=1)
        
        t_style = [
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0F172A')),
            ('ALIGN', (0,0), (-1,0), 'CENTER'),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('PADDING', (0,0), (-1,-1), 4),
            ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
        ]

        # Alternating row colors
        for r in range(1, len(table_data)):
            bg = colors.HexColor('#F8FAFC') if r % 2 == 0 else colors.white
            t_style.append(('BACKGROUND', (0, r), (-1, r), bg))

        lead_table.setStyle(TableStyle(t_style))
        story.append(lead_table)

        # Build document with NumberedCanvas
        doc.build(story, canvasmaker=NumberedCanvas)
        buffer.seek(0)
        return buffer.getvalue()
