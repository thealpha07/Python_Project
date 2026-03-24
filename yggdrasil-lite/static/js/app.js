/**
 * Yggdrasil Lite – Frontend App
 *
 * CONFIGURE THIS: Set your deployed Cloudflare Worker URL below.
 * After you run "wrangler deploy", it gives you a URL like:
 *   https://yggdrasil-lite.<your-subdomain>.workers.dev
 */
const WORKER_URL = "https://yggdrasil-lite.adarshsadanand.workers.dev";
// ↑↑ REPLACE THIS after deploying your Worker ↑↑

// ─── Progress Steps to simulate live progress ────────────────────────────────
const PROGRESS_STEPS = [
  { pct: 5, msg: "Initializing research engine..." },
  { pct: 12, msg: "Generating targeted search queries with AI..." },
  { pct: 22, msg: "Searching the web via Tavily..." },
  { pct: 38, msg: "Fetching and ranking sources..." },
  { pct: 52, msg: "Filtering high-quality academic & news sources..." },
  { pct: 65, msg: "Synthesizing research with Gemini AI..." },
  { pct: 78, msg: "Structuring IEEE-format report..." },
  { pct: 88, msg: "Formatting citations and bibliography..." },
  { pct: 95, msg: "Almost there..." },
];

// ─── IEEE PDF Generator (client-side via jsPDF) ──────────────────────────────
class IEEEPDFGenerator {
  generate(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ format: "letter", unit: "in" });

    const margin = 0.75;
    const pageW = 8.5;
    const pageH = 11;
    const colW = (pageW - 2 * margin - 0.25) / 2;
    const colGap = 0.25;

    // ── Title block (full width) ─────────────────────────────────────────
    doc.setFont("times", "bold");
    doc.setFontSize(16);
    const titleLines = doc.splitTextToSize(data.topic, pageW - 2 * margin);
    let y = margin + 0.2;
    titleLines.forEach((line) => {
      doc.text(line, pageW / 2, y, { align: "center" });
      y += 0.22;
    });

    y += 0.1;
    doc.setFont("times", "italic");
    doc.setFontSize(10);
    doc.text("Yggdrasil Deep Research Tool  •  AI-Synthesized Report", pageW / 2, y, { align: "center" });
    y += 0.1;
    doc.text(`Generated: ${new Date().toLocaleDateString("en-IN")}  •  Depth: ${data.depth || "standard"}`, pageW / 2, y, { align: "center" });
    y += 0.15;

    // Divider
    doc.setDrawColor(74, 155, 110);
    doc.setLineWidth(0.02);
    doc.line(margin, y, pageW - margin, y);
    y += 0.15;

    // ── Two-column body ──────────────────────────────────────────────────
    const col1X = margin;
    const col2X = margin + colW + colGap;

    // Convert markdown-ish synthesis to plain text sections
    const rawText = data.synthesis || "";
    const paragraphs = rawText
      .split(/\n\n+/)
      .map((p) => p.replace(/^#{1,3}\s*/, "").trim())
      .filter(Boolean);

    doc.setFont("times", "normal");
    doc.setFontSize(9.5);

    let col = 0; // 0 = left, 1 = right
    let colY = [y, y];
    const colXArr = [col1X, col2X];
    const bottomMargin = pageH - margin;

    const addText = (text, isBold = false) => {
      doc.setFont("times", isBold ? "bold" : "normal");
      const lines = doc.splitTextToSize(text, colW);
      lines.forEach((line) => {
        if (colY[col] + 0.15 > bottomMargin) {
          if (col === 0) {
            col = 1;
          } else {
            doc.addPage();
            colY = [margin, margin];
            col = 0;
          }
        }
        doc.text(line, colXArr[col], colY[col]);
        colY[col] += 0.145;
      });
      colY[col] += 0.07; // paragraph gap
    };

    // Print sections
    for (const para of paragraphs) {
      const isHeader =
        rawText.includes("## " + para) ||
        rawText.includes("### " + para) ||
        /^\d+\.\s/.test(para);
      addText(para, isHeader);
    }

    // ── References ───────────────────────────────────────────────────────
    if (data.bibliography && data.bibliography.length) {
      // Balance columns — move to max of both
      const refY = Math.max(colY[0], colY[1]) + 0.1;
      doc.setFont("times", "bold");
      doc.setFontSize(10);
      doc.text("References", col1X, refY);
      doc.setFont("times", "normal");
      doc.setFontSize(8.5);
      let ry = refY + 0.18;
      for (const ref of data.bibliography.slice(0, 20)) {
        const refText = `[${ref.index}] ${ref.title}. ${ref.source}. ${ref.url}`;
        const lines = doc.splitTextToSize(refText, pageW - 2 * margin);
        lines.forEach((l) => {
          if (ry + 0.14 > bottomMargin) {
            doc.addPage();
            ry = margin;
          }
          doc.text(l, col1X, ry);
          ry += 0.14;
        });
        ry += 0.04;
      }
    }

    // Save
    const filename = `Yggdrasil_${data.topic.replace(/\s+/g, "_").substring(0, 40)}.pdf`;
    doc.save(filename);
  }
}

// ─── IEEE DOCX Generator (client-side via docx.js) ───────────────────────────
class IEEEDOCXGenerator {
  async generate(data) {
    const {
      Document,
      Packer,
      Paragraph,
      TextRun,
      HeadingLevel,
      AlignmentType,
      BorderStyle,
      PageOrientation,
      convertInchesToTwip,
    } = docx;

    const synthesis = data.synthesis || "";
    const rawParagraphs = synthesis.split(/\n\n+/).filter(Boolean);

    const docChildren = [];

    // Title
    docChildren.push(
      new Paragraph({
        text: data.topic,
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
      })
    );

    // Subtitle
    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Yggdrasil Deep Research Tool  •  ${new Date().toLocaleDateString("en-IN")}  •  Depth: ${data.depth || "standard"}`,
            italics: true,
            size: 20,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      })
    );

    // Body paragraphs
    for (const para of rawParagraphs) {
      const isH2 = /^#{1,2}[^#]/.test(para);
      const isH3 = /^###/.test(para);
      const cleanPara = para.replace(/^#{1,3}\s*/, "").trim();

      if (isH2 || isH3) {
        docChildren.push(
          new Paragraph({
            text: cleanPara,
            heading: isH3 ? HeadingLevel.HEADING_3 : HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 100 },
          })
        );
      } else {
        docChildren.push(
          new Paragraph({
            children: [new TextRun({ text: cleanPara, size: 20 })],
            spacing: { after: 120 },
            alignment: AlignmentType.JUSTIFIED,
          })
        );
      }
    }

    // References
    if (data.bibliography && data.bibliography.length) {
      docChildren.push(
        new Paragraph({
          text: "References",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 100 },
        })
      );
      for (const ref of data.bibliography.slice(0, 20)) {
        docChildren.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `[${ref.index}] ${ref.title}. ${ref.source}. Available: ${ref.url}`,
                size: 18,
              }),
            ],
            spacing: { after: 80 },
          })
        );
      }
    }

    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: convertInchesToTwip(1),
                bottom: convertInchesToTwip(1),
                left: convertInchesToTwip(1),
                right: convertInchesToTwip(1),
              },
            },
          },
          children: docChildren,
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Yggdrasil_${data.topic.replace(/\s+/g, "_").substring(0, 40)}.docx`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }
}

// ─── Main Research App ────────────────────────────────────────────────────────
class ResearchApp {
  constructor() {
    this.form = document.getElementById("research-form");
    this.progressSection = document.getElementById("progress-section");
    this.resultsSection = document.getElementById("results-section");
    this.progressBar = document.getElementById("progress-bar");
    this.progressMessage = document.getElementById("progress-message");
    this.resultContent = document.getElementById("result-content");
    this.submitBtn = document.getElementById("submit-btn");

    this.currentResearch = null;
    this.pdfGen = new IEEEPDFGenerator();
    this.docxGen = new IEEEDOCXGenerator();

    this._progressTimer = null;
    this.init();
  }

  init() {
    this.form.addEventListener("submit", (e) => this.handleSubmit(e));
    document.getElementById("download-pdf").addEventListener("click", () => this.downloadPDF());
    document.getElementById("download-docx").addEventListener("click", () => this.downloadDOCX());
  }

  async handleSubmit(e) {
    e.preventDefault();
    const topic = document.getElementById("topic").value.trim();
    const format = document.querySelector('input[name="format"]:checked').value;
    const depth = document.getElementById("depth").value;

    if (!topic) { alert("Please enter a research topic"); return; }

    this.resetUI();
    this.progressSection.classList.add("active");
    this.submitBtn.disabled = true;
    this.submitBtn.innerHTML = '<span class="loading-spinner"></span> Researching...';

    // Simulate progress steps while fetch runs
    this.startProgressSimulation(depth);

    try {
      const data = await this.callWorker(topic, depth);

      // Stop simulation, jump to 100%
      this.stopProgressSimulation();
      this.updateProgress(100, "Research complete!");

      data.format = format;
      this.currentResearch = data;

      setTimeout(() => this.displayResults(data, format), 600);
    } catch (err) {
      this.stopProgressSimulation();
      console.error(err);
      this.showError(err.message || "Research failed. Please try again.");
    }

    this.submitBtn.disabled = false;
    this.submitBtn.textContent = "Start Research";
  }

  async callWorker(topic, depth) {
    const res = await fetch(`${WORKER_URL}/api/research`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, depth }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  }

  startProgressSimulation(depth) {
    const durations = { quick: 25000, standard: 45000, deep: 65000 };
    const totalMs = durations[depth] || 45000;
    const stepsCount = PROGRESS_STEPS.length;
    const interval = totalMs / stepsCount;

    let stepIdx = 0;
    this._progressTimer = setInterval(() => {
      if (stepIdx < stepsCount) {
        const step = PROGRESS_STEPS[stepIdx];
        this.updateProgress(step.pct, step.msg);
        stepIdx++;
      }
    }, interval);
  }

  stopProgressSimulation() {
    if (this._progressTimer) {
      clearInterval(this._progressTimer);
      this._progressTimer = null;
    }
  }

  updateProgress(pct, msg) {
    this.progressBar.style.width = `${pct}%`;
    this.progressBar.textContent = `${pct}%`;
    this.progressMessage.textContent = msg;
  }

  displayResults(data, format) {
    this.progressSection.classList.remove("active");
    this.resultsSection.classList.add("active");

    // Render synthesis as HTML (using marked.js)
    const html = window.marked ? marked.parse(data.synthesis || "") : this.fallbackRender(data.synthesis || "");
    this.resultContent.innerHTML = html;

    // Setup download buttons
    if (format === "pdf" || format === "both") {
      document.getElementById("download-pdf").style.display = "inline-block";
    }
    if (format === "docx" || format === "both") {
      document.getElementById("download-docx").style.display = "inline-block";
    }

    // Auto-trigger downloads if user selected file format
    if (format === "pdf") this.downloadPDF();
    if (format === "docx") this.downloadDOCX();
    if (format === "both") { this.downloadPDF(); setTimeout(() => this.downloadDOCX(), 800); }
  }

  downloadPDF() {
    if (!this.currentResearch) return;
    try { this.pdfGen.generate(this.currentResearch); }
    catch (e) { alert("PDF generation failed: " + e.message); }
  }

  async downloadDOCX() {
    if (!this.currentResearch) return;
    try { await this.docxGen.generate(this.currentResearch); }
    catch (e) { alert("DOCX generation failed: " + e.message); }
  }

  fallbackRender(text) {
    let html = text;
    html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
    html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
    html = html.replace(/^# (.+)$/gm, "<h2>$1</h2>");
    html = html.split("\n\n").map(p => p.startsWith("<h") ? p : `<p>${p}</p>`).join("\n");
    html = html.replace(/\[(\d+)\]/g, '<sup class="citation">[$1]</sup>');
    return html;
  }

  showError(msg) {
    this.progressSection.classList.remove("active");
    this.submitBtn.disabled = false;
    this.submitBtn.textContent = "Start Research";
    alert(`Error: ${msg}`);
  }

  resetUI() {
    this.progressSection.classList.remove("active");
    this.resultsSection.classList.remove("active");
    this.progressBar.style.width = "0%";
    this.progressBar.textContent = "";
    this.progressMessage.textContent = "";
    this.resultContent.innerHTML = "";
    document.getElementById("download-pdf").style.display = "none";
    document.getElementById("download-docx").style.display = "none";
  }
}

// ─── Music Controller ─────────────────────────────────────────────────────────
class MusicController {
  constructor() {
    this.audio = document.getElementById("background-music");
    this.muteBtn = document.getElementById("mute-toggle");
    this.isMuted = false;
    this.hasStarted = false;
    this.init();
  }

  init() {
    this.audio.volume = 0.3;
    this.muteBtn.addEventListener("click", () => this.toggleMute());
    this.audio.play().then(() => { this.hasStarted = true; }).catch(() => { });
    const start = () => {
      if (!this.hasStarted) { this.audio.play().catch(() => { }); this.hasStarted = true; }
    };
    document.addEventListener("click", start, { once: true });
    document.addEventListener("keydown", start, { once: true });
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    this.audio.muted = this.isMuted;
    this.muteBtn.textContent = this.isMuted ? "🔇" : "🔊";
    this.muteBtn.classList.toggle("muted", this.isMuted);
    if (!this.isMuted && !this.hasStarted) { this.audio.play().catch(() => { }); this.hasStarted = true; }
  }
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  new ResearchApp();
  new MusicController();
});
