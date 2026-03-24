"""
Generate a simple ambient background music file
"""
import numpy as np
from scipy.io import wavfile
import os

def generate_ambient_music(duration=120, sample_rate=44100):
    """Generate a simple ambient melody"""
    t = np.linspace(0, duration, int(sample_rate * duration))
    
    # Create a soothing ambient sound with multiple harmonics
    # Base frequency (A3 = 220 Hz)
    base_freq = 220
    
    # Create multiple layers
    layer1 = 0.3 * np.sin(2 * np.pi * base_freq * t)  # Base tone
    layer2 = 0.2 * np.sin(2 * np.pi * (base_freq * 1.5) * t)  # Perfect fifth
    layer3 = 0.15 * np.sin(2 * np.pi * (base_freq * 2) * t)  # Octave
    layer4 = 0.1 * np.sin(2 * np.pi * (base_freq * 0.5) * t)  # Sub-bass
    
    # Add slow modulation for ambient feel
    modulation = 0.5 + 0.5 * np.sin(2 * np.pi * 0.1 * t)
    
    # Combine layers with modulation
    audio = (layer1 + layer2 + layer3 + layer4) * modulation
    
    # Add fade in and fade out
    fade_duration = int(sample_rate * 2)  # 2 second fade
    fade_in = np.linspace(0, 1, fade_duration)
    fade_out = np.linspace(1, 0, fade_duration)
    
    audio[:fade_duration] *= fade_in
    audio[-fade_duration:] *= fade_out
    
    # Normalize
    audio = audio / np.max(np.abs(audio))
    
    # Convert to 16-bit PCM
    audio = (audio * 32767).astype(np.int16)
    
    return audio, sample_rate

# Generate the music
print("Generating ambient background music...")
audio, sample_rate = generate_ambient_music(duration=120)

# Save as WAV
output_path = "frontend/static/audio/background_music.wav"
os.makedirs(os.path.dirname(output_path), exist_ok=True)
wavfile.write(output_path, sample_rate, audio)

print(f"Background music saved to: {output_path}")
print("Duration: 120 seconds (2 minutes)")
print("Format: WAV, 44.1kHz, 16-bit")
