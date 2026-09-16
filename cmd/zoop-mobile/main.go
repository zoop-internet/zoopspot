//go:build android
// +build android

package main

/*
#include <stdlib.h>

extern void cOnStateChange(const char* state, const char* endpoint, int isDirect);
extern void cOnError(const char* errorCode, const char* message);
extern int cOnProtectSocket(int fd);
*/
import "C"
import (
	"log/slog"
	"unsafe"

	"github.com/allannuwamanya/zoop/packages/platform/mobile"
)

type jniCallback struct{}

func (j *jniCallback) OnStateChange(state string, endpoint string, isDirect bool) {
	cState := C.CString(state)
	defer C.free(unsafe.Pointer(cState))
	cEndpoint := C.CString(endpoint)
	defer C.free(unsafe.Pointer(cEndpoint))
	isDirectInt := 0
	if isDirect {
		isDirectInt = 1
	}
	C.cOnStateChange(cState, cEndpoint, C.int(isDirectInt))
}

func (j *jniCallback) OnError(errorCode string, message string) {
	cCode := C.CString(errorCode)
	defer C.free(unsafe.Pointer(cCode))
	cMsg := C.CString(message)
	defer C.free(unsafe.Pointer(cMsg))
	C.cOnError(cCode, cMsg)
}

func (j *jniCallback) OnProtectSocket(fd int) bool {
	res := C.cOnProtectSocket(C.int(fd))
	return res != 0
}

//export goInitMobile
func goInitMobile(configJSON *C.char) (ret C.int) {
	defer func() {
		if r := recover(); r != nil {
			slog.Error("panic recovered in goInitMobile", "recover", r)
			ret = -1
		}
	}()
	cfg := ""
	if configJSON != nil {
		cfg = C.GoString(configJSON)
	}
	cb := &jniCallback{}
	err := mobile.InitMobile(cfg, cb)
	if err != nil {
		return -1
	}
	return 0
}

//export goStartTunnel
func goStartTunnel(fd C.int, ifName *C.char) (ret C.int) {
	defer func() {
		if r := recover(); r != nil {
			slog.Error("panic recovered in goStartTunnel", "recover", r)
			ret = -1
		}
	}()
	name := "zoop0"
	if ifName != nil {
		name = C.GoString(ifName)
	}
	err := mobile.StartTunnel(int(fd), name)
	if err != nil {
		return -1
	}
	return 0
}

//export goConnectPeer
func goConnectPeer(peerPubKeyHex, candidatesJSON, relayURL, localIP *C.char) (ret C.int) {
	defer func() {
		if r := recover(); r != nil {
			slog.Error("panic recovered in goConnectPeer", "recover", r)
			ret = -1
		}
	}()
	peerKey := ""
	if peerPubKeyHex != nil {
		peerKey = C.GoString(peerPubKeyHex)
	}
	candidates := ""
	if candidatesJSON != nil {
		candidates = C.GoString(candidatesJSON)
	}
	relay := ""
	if relayURL != nil {
		relay = C.GoString(relayURL)
	}
	locIP := ""
	if localIP != nil {
		locIP = C.GoString(localIP)
	}
	err := mobile.ConnectPeerWithLocalIP(peerKey, candidates, relay, locIP)
	if err != nil {
		return -1
	}
	return 0
}

//export goNotifyNetworkChange
func goNotifyNetworkChange(networkType *C.char) {
	defer func() {
		if r := recover(); r != nil {
			slog.Error("panic recovered in goNotifyNetworkChange", "recover", r)
		}
	}()
	netType := "UNKNOWN"
	if networkType != nil {
		netType = C.GoString(networkType)
	}
	mobile.NotifyNetworkChange(netType)
}

//export goSetPowerSavingMode
func goSetPowerSavingMode(enabled C.int) {
	defer func() {
		if r := recover(); r != nil {
			slog.Error("panic recovered in goSetPowerSavingMode", "recover", r)
		}
	}()
	if enabled != 0 {
		mobile.PauseMobile()
	} else {
		mobile.ResumeMobile()
	}
}

//export goGetConnectionStatus
func goGetConnectionStatus() *C.char {
	defer func() {
		if r := recover(); r != nil {
			slog.Error("panic recovered in goGetConnectionStatus", "recover", r)
		}
	}()
	status := mobile.GetConnectionStatus()
	return C.CString(status)
}

//export goGetCandidatesJSON
func goGetCandidatesJSON(localIP *C.char) *C.char {
	defer func() {
		if r := recover(); r != nil {
			slog.Error("panic recovered in goGetCandidatesJSON", "recover", r)
		}
	}()
	locIP := ""
	if localIP != nil {
		locIP = C.GoString(localIP)
	}
	candidates := mobile.GetCandidatesJSONWithLocalIP(locIP)
	return C.CString(candidates)
}


//export goFreeString
func goFreeString(str *C.char) {
	if str != nil {
		C.free(unsafe.Pointer(str))
	}
}

//export goDisconnect
func goDisconnect() {
	defer func() {
		if r := recover(); r != nil {
			slog.Error("panic recovered in goDisconnect", "recover", r)
		}
	}()
	mobile.Disconnect()
}

func main() {}
