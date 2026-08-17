package main

import (
	"bytes"
	"flag"
	"image"
	"image/color"
	"image/draw"
	"image/png"
	"os"
	"runtime"

	"github.com/energye/systray"
	wailsRuntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

// TrayManager manages the system tray icon and background headless lifecycle.
type TrayManager struct {
	app       *App
	mShow     *systray.MenuItem
	mToggle   *systray.MenuItem
	mStatus   *systray.MenuItem
	mQuit     *systray.MenuItem
	connected bool
}

// NewTrayManager creates a new TrayManager instance bound to the app controller.
func NewTrayManager(app *App) *TrayManager {
	return &TrayManager{app: app}
}

// isHeadless checks if the environment is a headless test runner or lacks a GUI session bus.
func isHeadless() bool {
	// Detect go test execution
	if flag.Lookup("test.v") != nil {
		return true
	}
	// On Linux, verify display or dbus session exists
	if runtime.GOOS == "linux" {
		if os.Getenv("DBUS_SESSION_BUS_ADDRESS") == "" &&
			os.Getenv("DISPLAY") == "" &&
			os.Getenv("WAYLAND_DISPLAY") == "" {
			return true
		}
	}
	return false
}

// Start launches the system tray event loop in a background goroutine.
func (tm *TrayManager) Start() {
	if isHeadless() {
		return
	}

	go func() {
		defer func() {
			_ = recover()
		}()
		systray.Run(tm.onReady, tm.onExit)
	}()
}

func (tm *TrayManager) onReady() {
	defer func() {
		_ = recover()
	}()

	systray.SetIcon(createTrayIcon(false))
	systray.SetTitle("Zoop")
	systray.SetTooltip("Zoop Desktop: Disconnected")

	tm.mShow = systray.AddMenuItem("Show Zoop", "Bring main window to front")
	systray.AddSeparator()
	tm.mStatus = systray.AddMenuItem("Status: Disconnected", "Tunnel status")
	tm.mStatus.Disable()
	tm.mToggle = systray.AddMenuItem("Connect to Mesh", "Toggle WireGuard tunnel")
	systray.AddSeparator()
	tm.mQuit = systray.AddMenuItem("Quit Zoop", "Completely exit the application")

	tm.mShow.Click(func() {
		if tm.app != nil && tm.app.ctx != nil {
			wailsRuntime.WindowShow(tm.app.ctx)
			wailsRuntime.WindowUnminimise(tm.app.ctx)
		}
	})

	tm.mToggle.Click(func() {
		if tm.app != nil {
			status := tm.app.GetStatus()
			if status.Connected {
				_, _ = tm.app.Disconnect()
			} else {
				_, _ = tm.app.ConnectPeer("")
			}
			tm.UpdateState()
		}
	})

	tm.mQuit.Click(func() {
		systray.Quit()
		if tm.app != nil && tm.app.ctx != nil {
			wailsRuntime.Quit(tm.app.ctx)
		}
		os.Exit(0)
	})
}

func (tm *TrayManager) onExit() {
	// Clean up on systray shutdown
}

// UpdateState refreshes the tray icon, tooltip, and menu labels.
func (tm *TrayManager) UpdateState() {
	if tm.app == nil || isHeadless() {
		return
	}

	defer func() {
		_ = recover()
	}()

	status := tm.app.GetStatus()
	tm.connected = status.Connected

	systray.SetIcon(createTrayIcon(status.Connected))
	if status.Connected {
		systray.SetTooltip("Zoop: Connected (" + status.AssignedIP + ")")
		if tm.mStatus != nil {
			tm.mStatus.SetTitle("Status: Connected (" + status.AssignedIP + ")")
		}
		if tm.mToggle != nil {
			tm.mToggle.SetTitle("Disconnect")
		}
	} else {
		systray.SetTooltip("Zoop: Disconnected")
		if tm.mStatus != nil {
			tm.mStatus.SetTitle("Status: Disconnected")
		}
		if tm.mToggle != nil {
			tm.mToggle.SetTitle("Connect to Mesh")
		}
	}
}

// createTrayIcon draws an RGBA circular status indicator icon for the system tray.
func createTrayIcon(connected bool) []byte {
	const size = 32
	img := image.NewRGBA(image.Rect(0, 0, size, size))

	// Transparent background
	draw.Draw(img, img.Bounds(), &image.Uniform{color.Transparent}, image.Point{}, draw.Src)

	// Draw crisp indicator disc
	center := 16.0
	radius := 11.0
	var c color.RGBA
	if connected {
		c = color.RGBA{R: 16, G: 185, B: 129, A: 255} // Emerald
	} else {
		c = color.RGBA{R: 148, G: 163, B: 184, A: 255} // Slate
	}

	for y := 0; y < size; y++ {
		for x := 0; x < size; x++ {
			dx := float64(x) - center
			dy := float64(y) - center
			distSq := dx*dx + dy*dy
			if distSq <= radius*radius {
				img.Set(x, y, c)
			}
		}
	}

	var buf bytes.Buffer
	_ = png.Encode(&buf, img)
	return buf.Bytes()
}
