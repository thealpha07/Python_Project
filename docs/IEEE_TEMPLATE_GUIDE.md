# IEEE Template & PDF Conversion Guide

## Overview

This document explains how the IEEE template system works and how research content is converted to PDF.

---

## System Architecture

### 1. Template Specifications (`ieee_template.py`)

**Location**: `templates/ieee_format/ieee_template.py`

This file defines the **IEEE formatting rules** as Python constants:

```python
class IEEEFormat:
    # Page dimensions
    PAGE_SIZE = 'letter'  # 8.5 x 11 inches
    PAGE_WIDTH = 8.5 * 72  # Convert to points (1 inch = 72 points)
    
    # Margins (standard IEEE margins)
    MARGIN_TOP = 0.75 * 72     # 0.75 inches
    MARGIN_BOTTOM = 1 * 72     # 1 inch
    MARGIN_LEFT = 0.625 * 72   # 0.625 inches
    MARGIN_RIGHT = 0.625 * 72
    
    # Two-column layout
    COLUMN_COUNT = 2
    COLUMN_GAP = 0.25 * 72  # Space between columns
    
    # Typography
    FONT_FAMILY = 'Times-Roman'
    FONT_SIZE_BODY = 10
    FONT_SIZE_TITLE = 24
    FONT_SIZE_SECTION = 10
```

**What it does**:
- Defines physical page dimensions
- Sets margins conforming to IEEE standards
- Specifies fonts and sizes
- Provides helper methods like `get_body_style()`, `get_section_style()`

---

### 2. PDF Generator (`pdf_generator.py`)

**Location**: `backend/export/pdf_generator.py`

This file **converts research text to PDF** using the IEEE template.

#### Key Components:

##### A. Document Setup
```python
# Create base template with IEEE margins
doc = BaseDocTemplate(
    filepath,
    pagesize=letter,
    leftMargin=IEEEFormat.MARGIN_LEFT,
    rightMargin=IEEEFormat.MARGIN_RIGHT,
    topMargin=IEEEFormat.MARGIN_TOP,
    bottomMargin=IEEEFormat.MARGIN_BOTTOM
)
```

##### B. Two-Column Layout Creation
```python
# Calculate column width
frame_width = IEEEFormat.COLUMN_WIDTH
frame_height = IEEEFormat.PAGE_HEIGHT - margins

# Left column frame
frame1 = Frame(
    IEEEFormat.MARGIN_LEFT,      # X position
    IEEEFormat.MARGIN_BOTTOM,    # Y position
    frame_width,                  # Width
    frame_height,                 # Height
    id='col1'
)

# Right column frame  
frame2 = Frame(
    IEEEFormat.MARGIN_LEFT + frame_width + IEEEFormat.COLUMN_GAP,
    IEEEFormat.MARGIN_BOTTOM,
    frame_width,
    frame_height,
    id='col2'
)

# Create page template with both frames
template = PageTemplate(id='TwoColumn', frames=[frame1, frame2])
```

**How it works**: Content flows automatically:
1. Fills left column (frame1) from top to bottom
2. When left column is full, flows to right column (frame2)
3. When both columns are full, creates new page
4. Repeats process

##### C. Content Generation Process

```python
story = []  # Content array

# 1. Add title (spans full width)
story.append(Paragraph(topic, styles['Title']))

# 2. Add sections
for section_title, section_content in sections:
    # Section heading
    story.append(Paragraph(
        f"{number}. {section_title.upper()}", 
        styles['Heading1']
    ))
    
    # Section paragraphs
    for paragraph in section_content:
        story.append(Paragraph(paragraph, styles['BodyText']))

# 3. Build PDF (content flows into columns automatically)
doc.build(story)
```

---

## Data Flow: Research → PDF

### Step-by-Step Conversion

```
1. Research Engine generates synthesis text
   ↓
2. Text contains sections (markdown format):
   # Abstract
   The research findings...
   
   # Introduction
   This paper explores...
   ↓
3. pdf_generator.py parses sections:
   _parse_sections(synthesis)
   ↓
   Returns: [('Abstract', 'content...'), ('Introduction', 'content...')]
   ↓
4. For each section:
   - Create heading paragraph with IEEE style
   - Create body paragraphs with IEEE style
   - Add to 'story' array
   ↓
5. ReportLab flows story into two-column frames:
   - Left column fills first
   - Then right column
   - Then next page
   ↓
6. Output: IEEE-formatted PDF saved to outputs/
```

---

## Customization Guide

### Changing Page Layout

**Location**: `templates/ieee_format/ieee_template.py`

```python
# Make wider margins (less content per page)
MARGIN_LEFT = 1.0 * 72  # Increase from 0.625 to 1.0 inch

# Make narrower column gap
COLUMN_GAP = 0.15 * 72  # Decrease from 0.25

# Use single column instead of two
COLUMN_COUNT = 1  
# (Also need to modify pdf_generator.py to use 1 frame)
```

### Changing Fonts

```python
# Use different font family
FONT_FAMILY = 'Helvetica'  # Instead of Times-Roman

# Larger body text
FONT_SIZE_BODY = 11  # Instead of 10

# Larger title
FONT_SIZE_TITLE = 28  # Instead of 24
```

### Adjusting Output Length

**Location**: `backend/llm/ollama_client.py`

```python
def synthesize_research(self, topic: str, information: List[Dict]) -> str:
    response = self.generate(
        prompt, 
        temperature=0.6, 
        max_tokens=4000  # ← Increase this for longer output
                         # 4000 tokens ≈ 3000 words ≈ 6 pages
                         # 6000 tokens ≈ 4500 words ≈ 9 pages
    )
```

**Also modify prompt** in `backend/llm/prompts.py`:
```python
SYNTHESIS_PROMPT = """...
Create a well-structured research report of approximately 4000 words...
"""
```

---

## Helpful Resources

### ReportLab (PDF Generation Library)

**Official Documentation**:
- **User Guide**: https://www.reportlab.com/docs/reportlab-userguide.pdf
  - Chapter 5: Platypus (Page Layout) - explains Frames, Templates
  - Chapter 6: Paragraphs & Typography
  - Chapter 7: Tables

**Key Concepts**:
- **BaseDocTemplate**: Base PDF document with custom layouts
- **Frame**: Rectangular region where content flows (like columns)
- **PageTemplate**: Defines frame arrangement for a page type
- **Flowables**: Content elements (Paragraph, Spacer, Image, etc.)
- **Story**: List of flowables that flow through frames

**Tutorials**:
- Multi-column layouts: https://www.reportlab.com/documentation/faq/
- Custom page templates: Search "ReportLab two column" on Stack Overflow

### IEEE Paper Format

**Official IEEE Style Guide**:
- https://www.ieee.org/conferences/publishing/templates.html
- Download official Word/LaTeX templates to see exact specs

**Key IEEE Requirements**:
- Two-column format (except title/abstract)
- Times New Roman 10pt body text
- 0.75" top, 1" bottom, 0.625" left/right margins
- Section headings: Roman numerals (I, II, III)
- References: IEEE citation style [1], [2]

### Python PDF Libraries Comparison

| Library | Use Case | Complexity | Two-Column Support |
|---------|----------|------------|-------------------|
| **ReportLab** | Professional PDFs, complex layouts | Medium | ✅ Full control |
| WeasyPrint | HTML → PDF, simple layouts | Easy | ⚠️ CSS columns only |
| PyPDF2 | PDF manipulation (merge/split) | Easy | ❌ No content creation |
| fpdf | Simple PDFs, basic layouts | Easy | ❌ Manual positioning |
| LaTeX (via subprocess) | Academic papers, perfect typography | Hard | ✅ Excellent |

**Why ReportLab for this project**:
- Precise control over two-column layout
- Programmatic content generation (no HTML/LaTeX intermediary)
- Professional typography
- Pure Python (no external dependencies like TeX)

---

## Common Modifications

### 1. Add Header/Footer

**In** `pdf_generator.py`:
```python
def _add_header_footer(self, canvas_obj, doc):
    """Currently adds page numbers, can add more"""
    canvas_obj.saveState()
    
    # Add header (e.g., paper title)
    canvas_obj.setFont('Times-Roman', 9)
    canvas_obj.drawString(
        IEEEFormat.MARGIN_LEFT, 
        IEEEFormat.PAGE_HEIGHT - 0.5 * inch,
        "Yggdrasil Deep Research Tool"  # Custom header
    )
    
    # Page number (already implemented)
    page_num = canvas_obj.getPageNumber()
    canvas_obj.drawCentredString(
        IEEEFormat.PAGE_WIDTH / 2,
        0.5 * inch,
        str(page_num)
    )
    
    canvas_obj.restoreState()
```

### 2. Add Images/Figures

```python
from reportlab.platypus import Image

# In generate() method, within story building:
story.append(Paragraph("Figure caption", styles['Caption']))
story.append(Image('path/to/image.png', width=3*inch, height=2*inch))
story.append(Spacer(1, 0.1 * inch))
```

### 3. Change Color Scheme

```python
from reportlab.lib import colors

# In _create_styles():
{
    'name': 'Heading1',
    'textColor': colors.HexColor('#1a4d2e'),  # Green instead of black
    # ... other settings
}
```

---

## Troubleshooting

### PDF is too short
- **Increase** `max_tokens` in `ollama_client.py` `synthesize_research()`
- **Add word count** to `SYNTHESIS_PROMPT`

### Columns don't align properly
- Check `COLUMN_WIDTH` calculation in `ieee_template.py`
- Ensure `COLUMN_GAP + 2*COLUMN_WIDTH` ≤ `PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT`

### Content gets cut off
- Increase `PAGE_HEIGHT` or decrease `MARGIN_TOP/BOTTOM`
- Check `frame_height` calculation

### Font not found error
- ReportLab includes: Times-Roman, Times-Bold, Helvetica, Courier
- For custom fonts, need to register: `pdfmetrics.registerFont()`

---

## Next Steps: Enhancing Your Project

1. **Add Table of Contents**: Use ReportLab's `TableOfContents` flowable
2. **Include Figures/Charts**: Generate matplotlib charts, embed with `Image`
3. **Better Citations**: Parse citation markers, format IEEE style automatically
4. **LaTeX Math**: Use mathtext or MathML for equations
5. **Accessibility**: Add PDF metadata, alt text for images

---

**For More Help**: Check ReportLab
 User Guide (PDF), especially Chapter 5 on Platypus page layouts.
