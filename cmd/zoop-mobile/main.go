package main

/*
#include <stdlib.h>
*/
import "C"
import (
	"unsafe"

	"github.com/allannuwamanya/zoop/packages/platform/mobile"
)

//export ZoopInitMobile
func ZoopInitMobile(configJSON *C.char) C.int {
	cfg := ""
	if configJSON != nil {
		cfg = C.GoString(configJSON)
	}
	err := mobile.InitMobile(cfg, nil)
	if err != nil {
		return -1
	}
	return 0
}

//export ZoopStartTunnel
func ZoopStartTunnel(fd C.int, ifName *C.char) C.int {
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

//export ZoopConnectPeer
func ZoopConnectPeer(peerPubKeyHex, candidatesJSON, relayURL *C.char) C.int {
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
	err := mobile.ConnectPeer(peerKey, candidates, relay)
	if err != nil {
		return -1
	}
	return 0
}

//export ZoopNotifyNetworkChange
func ZoopNotifyNetworkChange(networkType *C.char) {
	netType := "UNKNOWN"
	if networkType != nil {
		netType = C.GoString(networkType)
	}
	mobile.NotifyNetworkChange(netType)
}

//export ZoopGetConnectionStatus
func ZoopGetConnectionStatus() *C.char {
	status := mobile.GetConnectionStatus()
	return C.CString(status)
}

//export ZoopFreeString
func ZoopFreeString(str *C.char) {
	if str != nil {
		C.free(unsafe.Pointer(str))
	}
}

//export ZoopDisconnect
func ZoopDisconnect() {
	mobile.Disconnect()
}

func main() {}
