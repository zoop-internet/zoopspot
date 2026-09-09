#!/usr/bin/env python3
import ctypes
import subprocess
import time
import sys

def style_emulator(timeout=45):
    start = time.time()
    try:
        x11 = ctypes.cdll.LoadLibrary("libX11.so.6")
        d = x11.XOpenDisplay(None)
    except Exception:
        return False
    if not d:
        return False

    while time.time() - start < timeout:
        try:
            out = subprocess.check_output(["xwininfo", "-root", "-tree"], stderr=subprocess.DEVNULL).decode("utf-8")
        except Exception:
            time.sleep(0.5)
            continue

        phone_win = None
        toolbar_win = None
        for line in out.splitlines():
            if "Android Emulator - MyPhone" in line:
                phone_win = int(line.strip().split()[0], 16)
            elif '0x' in line and '"Emulator": ("qemu-system-x86_64" "Emulator")' in line and '59x' in line:
                toolbar_win = int(line.strip().split()[0], 16)

        if phone_win and toolbar_win:
            # Resize phone window to real physical handheld size (320x678)
            x11.XResizeWindow(d, phone_win, 320, 678)
            # Hide the side toolbar strip
            x11.XUnmapWindow(d, toolbar_win)
            x11.XFlush(d)
            x11.XCloseDisplay(d)
            print("Successfully sized emulator to real size (320x678) and hid side toolbar.")
            return True
        time.sleep(0.5)

    x11.XCloseDisplay(d)
    return False

if __name__ == "__main__":
    style_emulator()
