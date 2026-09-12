"""Generate assets/bell.wav, the rest-timer notification sound.

A struck bell is a sum of inharmonic partials that each decay at their own
rate: the high ones die fast and leave the hum tone ringing. Two strikes,
the second softer, so it reads as a bell and not a single beep.

Run: uv run scripts/bell.py
"""

import math
import struct
import wave

RATE = 44100
STRIKES = [(0.0, 1.0), (0.62, 0.72)]  # (start seconds, gain)
LENGTH = 2.6  # seconds, well under the 30s iOS limit
F0 = 587.33  # D5

# (frequency ratio, amplitude, decay seconds) — roughly a tubular bell.
PARTIALS = [
    (0.5, 0.50, 2.20),
    (1.0, 1.00, 1.60),
    (1.183, 0.42, 1.10),
    (1.506, 0.35, 0.80),
    (2.0, 0.28, 0.55),
    (2.514, 0.18, 0.38),
    (2.662, 0.14, 0.30),
    (3.011, 0.10, 0.22),
    (4.166, 0.06, 0.14),
]


def strike(t: float) -> float:
    """One bell strike sampled `t` seconds after it was hit."""
    if t < 0:
        return 0.0
    return sum(
        amp * math.exp(-t / decay) * math.sin(2 * math.pi * F0 * ratio * t)
        for ratio, amp, decay in PARTIALS
    )


def main() -> None:
    frames = bytearray()
    peak = sum(amp for _, amp, _ in PARTIALS)
    for i in range(int(LENGTH * RATE)):
        t = i / RATE
        v = sum(gain * strike(t - start) for start, gain in STRIKES) / peak
        # 2ms fade-in kills the click from starting mid-cycle.
        v *= min(1.0, t / 0.002)
        frames += struct.pack('<h', max(-32767, min(32767, int(v * 26000))))

    with wave.open('assets/bell.wav', 'wb') as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(RATE)
        f.writeframes(bytes(frames))


if __name__ == '__main__':
    main()
