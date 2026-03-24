// Deep Research Assistant - Frontend JavaScript

class ResearchApp {
    constructor() {
        this.form = document.getElementById('research-form');
        this.progressSection = document.getElementById('progress-section');
        this.resultsSection = document.getElementById('results-section');
        this.progressBar = document.getElementById('progress-bar');
        this.progressMessage = document.getElementById('progress-message');
        this.resultContent = document.getElementById('result-content');
        this.submitBtn = document.getElementById('submit-btn');

        this.currentResearch = null;
        this.eventSource = null;

        this.init();
    }

    init() {
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    async handleSubmit(e) {
        e.preventDefault();

        const topic = document.getElementById('topic').value.trim();
        const format = document.querySelector('input[name="format"]:checked').value;
        const depth = document.getElementById('depth').value;

        if (!topic) {
            alert('Please enter a research topic');
            return;
        }

        // Reset UI
        this.resetUI();

        // Show progress
        this.progressSection.classList.add('active');
        this.submitBtn.disabled = true;
        this.submitBtn.innerHTML = '<span class="loading-spinner"></span> Researching...';

        // Start research
        try {
            await this.conductResearch(topic, format, depth);
        } catch (error) {
            console.error('Research error:', error);
            this.showError(error.message);
        }
    }

    async conductResearch(topic, format, depth) {
        // Setup SSE for progress updates
        this.eventSource = new EventSource(
            `/api/research/stream?topic=${encodeURIComponent(topic)}&format=${format}&depth=${depth}`
        );

        this.eventSource.addEventListener('progress', (e) => {
            const data = JSON.parse(e.data);
            this.updateProgress(data.progress, data.message);
        });

        this.eventSource.addEventListener('complete', (e) => {
            console.log('Research complete event received');
            try {
                // AlWAYS close the connection immediately upon receiving complete
                // This prevents auto-reconnection if the handler fails
                this.eventSource.close();
                console.log('EventSource closed');

                const data = JSON.parse(e.data);
                this.handleComplete(data);
            } catch (err) {
                console.error('Error handling complete event:', err);
                this.eventSource.close(); // Ensure it's closed
                this.showError('Research completed but failed to display results: ' + err.message);
                this.submitBtn.disabled = false;
                this.submitBtn.textContent = 'Start Research';
            }
        });

        this.eventSource.addEventListener('error', (e) => {
            console.error('SSE Error:', e);
            this.eventSource.close();
            this.showError('Connection error. Please try again.');
        });

    }

    updateProgress(progress, message) {
        this.progressBar.style.width = `${progress}%`;
        this.progressBar.textContent = `${progress}%`;
        this.progressMessage.textContent = message;
    }

    handleComplete(data) {
        this.eventSource.close();
        this.currentResearch = data;

        // Update progress to 100%
        this.updateProgress(100, 'Research complete!');

        // Show results
        setTimeout(() => {
            this.displayResults(data);
        }, 500);

        // Re-enable submit
        this.submitBtn.disabled = false;
        this.submitBtn.textContent = 'Start Research';
    }

    displayResults(data) {
        // Hide progress, show results
        this.progressSection.classList.remove('active');
        this.resultsSection.classList.add('active');

        // Format and display synthesis
        const formatted = this.formatSynthesis(data.synthesis);
        this.resultContent.innerHTML = formatted;

        // Setup download buttons
        this.setupDownloadButtons(data);
    }

    formatSynthesis(text) {
        // Convert markdown-style text to HTML
        let html = text;

        // Headers
        html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
        html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
        html = html.replace(/^# (.+)$/gm, '<h2>$1</h2>');

        // Paragraphs
        html = html.split('\n\n').map(para => {
            if (!para.startsWith('<h')) {
                return `<p>${para}</p>`;
            }
            return para;
        }).join('\n');

        // Citations
        html = html.replace(/\[(\d+)\]/g, '<sup class="citation">[$1]</sup>');

        return html;
    }

    setupDownloadButtons(data) {
        const format = data.format;

        if (format === 'pdf' || format === 'both') {
            document.getElementById('download-pdf').style.display = 'inline-block';
            document.getElementById('download-pdf').onclick = () => this.downloadFile('pdf');
        }

        if (format === 'docx' || format === 'both') {
            document.getElementById('download-docx').style.display = 'inline-block';
            document.getElementById('download-docx').onclick = () => this.downloadFile('docx');
        }
    }

    async downloadFile(format) {
        if (!this.currentResearch) return;

        const response = await fetch(`/api/download/${format}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(this.currentResearch)
        });

        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `research_${Date.now()}.${format}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } else {
            alert('Download failed. Please try again.');
        }
    }

    showError(message) {
        this.progressSection.classList.remove('active');
        this.submitBtn.disabled = false;
        this.submitBtn.textContent = 'Start Research';
        alert(`Error: ${message}`);
    }

    resetUI() {
        this.progressSection.classList.remove('active');
        this.resultsSection.classList.remove('active');
        this.progressBar.style.width = '0%';
        this.progressBar.textContent = '';
        this.progressMessage.textContent = '';
        this.resultContent.innerHTML = '';
        document.getElementById('download-pdf').style.display = 'none';
        document.getElementById('download-docx').style.display = 'none';
    }
}

// Simplified Music Controller - Auto-play with Mute Only
class MusicController {
    constructor() {
        this.audio = document.getElementById('background-music');
        this.muteBtn = document.getElementById('mute-toggle');
        this.isMuted = false;
        this.hasStarted = false;

        this.init();
    }

    init() {
        // Set default volume
        this.audio.volume = 0.3;

        // Event listener for mute button
        this.muteBtn.addEventListener('click', () => this.toggleMute());

        // Try to auto-play (may be blocked by browser)
        this.attemptAutoPlay();

        // Fallback: play on first user interaction
        const startOnInteraction = () => {
            if (!this.hasStarted) {
                this.audio.play().catch(err => console.log('Auto-play prevented:', err));
                this.hasStarted = true;
            }
        };

        document.addEventListener('click', startOnInteraction, { once: true });
        document.addEventListener('keydown', startOnInteraction, { once: true });
    }

    attemptAutoPlay() {
        this.audio.play().then(() => {
            this.hasStarted = true;
            console.log('Music auto-playing');
        }).catch(err => {
            console.log('Auto-play blocked, waiting for user interaction:', err);
        });
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        this.audio.muted = this.isMuted;

        // Update button appearance and icon
        if (this.isMuted) {
            this.muteBtn.textContent = '🔇';
            this.muteBtn.classList.add('muted');
        } else {
            this.muteBtn.textContent = '🔊';
            this.muteBtn.classList.remove('muted');
        }

        // Ensure music is playing when unmuted
        if (!this.isMuted && !this.hasStarted) {
            this.audio.play().catch(err => console.log('Play error:', err));
            this.hasStarted = true;
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new ResearchApp();
    new MusicController();
});
