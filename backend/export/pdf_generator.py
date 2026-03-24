"""
PDF Generator with IEEE Two-Column Formatting - Fixed Version
"""
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_JUSTIFY, TA_CENTER, TA_LEFT
from reportlab.platypus import (
    BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, 
    PageBreak, Table, TableStyle, KeepTogether
)
from reportlab.lib import colors
from datetime import datetime
import os
import re

from templates.ieee_format.ieee_template import IEEEFormat, DocumentStructure
from config import Config


class IEEEPDFGenerator:
    """Generate IEEE-formatted PDF documents with two-column layout"""
    
    def __init__(self, output_dir: str = None):
        self.output_dir = output_dir or Config.OUTPUT_DIR
        os.makedirs(self.output_dir, exist_ok=True)
        
        # Setup styles
        self.styles = self._create_styles()
    
    def generate(self, research_data: dict, filename: str = None) -> str:
        """
        Generate two-column IEEE PDF from research data
        
        Args:
            research_data: Dict with topic, synthesis, bibliography, metadata
            filename: Output filename (auto-generated if None)
        
        Returns:
            Path to generated PDF
        """
        if filename is None:
            topic_slug = research_data['topic'].replace(' ', '_')[:50]
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f"research_{topic_slug}_{timestamp}.pdf"
        
        filepath = os.path.join(self.output_dir, filename)
        
        # Create two-column document template
        doc = BaseDocTemplate(
            filepath,
            pagesize=letter,
            leftMargin=IEEEFormat.MARGIN_LEFT,
            rightMargin=IEEEFormat.MARGIN_RIGHT,
            topMargin=IEEEFormat.MARGIN_TOP,
            bottomMargin=IEEEFormat.MARGIN_BOTTOM
        )
        
        # Define frames for two-column layout
        frame_width = IEEEFormat.COLUMN_WIDTH
        frame_height = IEEEFormat.PAGE_HEIGHT - IEEEFormat.MARGIN_TOP - IEEEFormat.MARGIN_BOTTOM
        
        # Left column frame
        frame1 = Frame(
            IEEEFormat.MARGIN_LEFT,
            IEEEFormat.MARGIN_BOTTOM,
            frame_width,
            frame_height,
            id='col1',
            showBoundary=0
        )
        
        # Right column frame
        frame2 = Frame(
            IEEEFormat.MARGIN_LEFT + frame_width + IEEEFormat.COLUMN_GAP,
            IEEEFormat.MARGIN_BOTTOM,
            frame_width,
            frame_height,
            id='col2',
            showBoundary=0
        )
        
        # Two-column page template
        two_column_template = PageTemplate(
            id='TwoColumn',
            frames=[frame1, frame2],
            onPage=self._add_header_footer
        )
        
        doc.addPageTemplates([two_column_template])
        
        # Build content
        story = []
        
        # Title (spans both columns by using full width paragraph)
        story.append(Paragraph(research_data['topic'], self.styles['Title']))
        story.append(Spacer(1, 0.1 * inch))
        
        # Author and date
        author_text = "Yggdrasil Deep Research Tool"
        date_text = datetime.now().strftime("%B %d, %Y")
        story.append(Paragraph(author_text, self.styles['Author']))
        story.append(Paragraph(date_text, self.styles['Author']))
        story.append(Spacer(1, 0.2 * inch))
        
        # Parse and add content sections
        synthesis = research_data.get('synthesis', '')
        # Clean synthesis to remove duplicate references sections
        synthesis = self._clean_synthesis(synthesis)
        sections = self._parse_sections(synthesis)
        
        section_counter = 0  # Track actual section numbers (excluding abstract)
        references_seen = False  # Track if we've seen a REFERENCES section
        
        for i, (section_title, section_content) in enumerate(sections):
            # Check if this is a REFERENCES section
            is_references = section_title.upper() == 'REFERENCES'
            
            # Skip first REFERENCES occurrence, keep the second
            if is_references:
                if references_seen:
                    # This is the second REFERENCES, keep it with section number
                    section_num = DocumentStructure.get_section_number(section_counter)
                    heading = f"{section_num}.  REFERENCES"
                    section_counter += 1
                else:
                    # This is the first REFERENCES, skip it
                    references_seen = True
                    continue
            elif section_title.upper() == 'ABSTRACT':
                heading = "ABSTRACT"
            elif IEEEFormat.USE_SECTION_NUMBERS:
                section_num = DocumentStructure.get_section_number(section_counter)
                heading = f"{section_num}.  {section_title.upper()}"
                section_counter += 1
            else:
                heading = section_title.upper()
            
            story.append(Paragraph(heading, self.styles['Heading1']))
            story.append(Spacer(1, 0.06 * inch))
            
            # Section content
            # Use Abstract style for abstract section
            if section_title.upper() == 'ABSTRACT':
                style = self.styles['Abstract']
            else:
                style = self.styles['BodyText']
            
            paragraphs = section_content.split('\n\n')
            for para in paragraphs:
                if para.strip():
                    # Clean up the paragraph
                    cleaned_para = para.strip()
                    # Remove any remaining markdown headers
                    cleaned_para = re.sub(r'^#+\s*', '', cleaned_para)
                    # Remove markdown bold formatting (**text**)
                    cleaned_para = re.sub(r'\*\*([^*]+)\*\*', r'\1', cleaned_para)
                    # Remove any stray asterisks
                    cleaned_para = cleaned_para.replace('**', '')
                    
                    if cleaned_para:
                        story.append(Paragraph(cleaned_para, style))
                        story.append(Spacer(1, 0.04 * inch))
        
        # Add bibliography if not already in synthesis
        bibliography = research_data.get('bibliography', '')
        if bibliography and not any(s[0].upper() == 'REFERENCES' for s in sections):
            story.append(Spacer(1, 0.15 * inch))
            story.append(Paragraph("REFERENCES", self.styles['Heading1']))
            story.append(Spacer(1, 0.06 * inch))
            
            # Parse references
            ref_lines = bibliography.split('\n')
            for line in ref_lines:
                if line.strip() and line.strip().upper() != 'REFERENCES':
                    story.append(Paragraph(line.strip(), self.styles['Reference']))
                    story.append(Spacer(1, 0.03 * inch))
        
        # Build PDF
        doc.build(story)
        
        return filepath
    
    def _clean_synthesis(self, text: str) -> str:
        """Remove duplicate references sections and clean up text"""
        # Find all REFERENCES section positions
        lines = text.split('\n')
        references_positions = []
        
        for i, line in enumerate(lines):
            if re.match(r'^#+\s*references\s*$', line.strip(), re.IGNORECASE) or \
               line.strip().upper() == 'REFERENCES':
                references_positions.append(i)
        
        # If multiple REFERENCES sections found, keep only the last one
        if len(references_positions) > 1:
            # Remove all but the last references section
            cleaned_lines = []
            skip_until = -1
            
            for i, line in enumerate(lines):
                # If this is a references heading (but not the last one)
                if i in references_positions[:-1]:  # All except last
                    # Skip this section until we hit the next major section
                    skip_until = i
                    continue
                
                # If we're skipping and hit a new section, stop skipping
                if skip_until >= 0 and i > skip_until:
                    if re.match(r'^#+\s*\w+', line.strip()) and \
                       not re.match(r'^#+\s*references', line.strip(), re.IGNORECASE):
                        skip_until = -1
                        cleaned_lines.append(line)
                    elif i >= references_positions[-1]:  # Reached last references
                        skip_until = -1
                        cleaned_lines.append(line)
                    # Otherwise keep skipping
                elif skip_until < 0:
                    cleaned_lines.append(line)
            
            return '\n'.join(cleaned_lines)
        
        return text
    
    def _create_styles(self):
        """Create custom styles for IEEE format"""
        styles = getSampleStyleSheet()
        
        # Define styles configuration
        style_configs = [
            {
                'name': 'Title',
                'parent': 'Heading1', 
                'fontSize': IEEEFormat.FONT_SIZE_TITLE,
                'textColor': colors.black,
                'spaceAfter': 6,
                'alignment': TA_CENTER,
                'fontName': 'Times-Bold'
            },
            {
                'name': 'Author',
                'parent': 'Normal',
                'fontSize': IEEEFormat.FONT_SIZE_AUTHORS,
                'textColor': colors.black,
                'alignment': TA_CENTER,
                'fontName': 'Times-Roman',
                'spaceAfter': 3
            },
            {
                'name': 'BodyText',
                'parent': 'Normal',
                'fontSize': IEEEFormat.FONT_SIZE_BODY,
                'leading': IEEEFormat.FONT_SIZE_BODY * 1.2,
                'alignment': TA_JUSTIFY,
                'fontName': 'Times-Roman',
                'spaceAfter': IEEEFormat.PARAGRAPH_SPACING
            },
            {
                'name': 'Heading1',
                'parent': 'Heading1',
                'fontSize': IEEEFormat.FONT_SIZE_SECTION,
                'textColor': colors.black,
                'spaceBefore': IEEEFormat.SECTION_SPACING_BEFORE,
                'spaceAfter': IEEEFormat.SECTION_SPACING_AFTER,
                'fontName': 'Times-Bold',
                'alignment': TA_LEFT,  # Changed from CENTER to LEFT
                'keepWithNext': True
            },
            {
                'name': 'Abstract',
                'parent': 'Normal',
                'fontSize': IEEEFormat.FONT_SIZE_ABSTRACT,
                'leading': IEEEFormat.FONT_SIZE_ABSTRACT * 1.2,
                'alignment': TA_JUSTIFY,
                'fontName': 'Times-Italic',
                'leftIndent': 0,
                'rightIndent': 0
            },
            {
                'name': 'Reference',
                'parent': 'Normal',
                'fontSize': IEEEFormat.FONT_SIZE_REFERENCES,
                'leading': IEEEFormat.FONT_SIZE_REFERENCES * 1.15,
                'alignment': TA_LEFT,
                'fontName': 'Times-Roman',
                'leftIndent': 12,
                'firstLineIndent': -12
            }
        ]

        for config in style_configs:
            name = config.pop('name')
            parent_name = config.pop('parent')
            
            if name in styles:
                style = styles[name]
                for key, value in config.items():
                    setattr(style, key, value)
            else:
                parent = styles[parent_name]
                styles.add(ParagraphStyle(name=name, parent=parent, **config))
        
        return styles
    
    def _parse_sections(self, text: str) -> list:
        """Parse text into sections"""
        sections = []
        current_section = None
        current_content = []
        
        lines = text.split('\n')
        
        for line in lines:
            # Check if line is a section heading
            if self._is_section_heading(line):
                # Save previous section
                if current_section:
                    sections.append((current_section, '\n'.join(current_content)))
                
                # Start new section
                current_section = line.strip().replace('#', '').strip()
                current_content = []
            else:
                if line.strip():
                    current_content.append(line)
        
        # Add last section
        if current_section:
            sections.append((current_section, '\n'.join(current_content)))
        
        return sections
    
    def _is_section_heading(self, line: str) -> bool:
        """Check if line is a section heading"""
        line = line.strip()
        
        # Check for markdown headings
        if line.startswith('#'):
            return True
        
        # Check for common section titles
        common_sections = [
            'abstract', 'introduction', 'background', 'methodology',
            'results', 'discussion', 'conclusion', 'references',
            'literature review', 'main findings', 'future work'
        ]
        
        return any(section in line.lower() for section in common_sections)
    
    def _add_header_footer(self, canvas_obj, doc):
        """Add header and footer to pages"""
        canvas_obj.saveState()
        
        # Footer with page number
        page_num = canvas_obj.getPageNumber()
        text = f"{page_num}"
        canvas_obj.setFont('Times-Roman', 9)
        canvas_obj.drawCentredString(
            IEEEFormat.PAGE_WIDTH / 2,
            0.5 * inch,
            text
        )
        
        canvas_obj.restoreState()
