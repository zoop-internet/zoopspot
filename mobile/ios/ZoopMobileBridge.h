#ifndef ZOOP_MOBILE_BRIDGE_H
#define ZOOP_MOBILE_BRIDGE_H

#include <stdint.h>
#include <stdbool.h>

#ifdef __cplusplus
extern "C" {
#endif

// Function pointer signatures for C callbacks to Swift / Objective-C
typedef void (*ZoopStateCallbackFn)(const char* state, const char* endpoint, bool is_direct);
typedef void (*ZoopErrorCallbackFn)(const char* error_code, const char* message);

// Native C-shared library exports from libzoop
int ZoopInitMobile(const char* config_json, ZoopStateCallbackFn state_cb, ZoopErrorCallbackFn err_cb);
int ZoopStartTunnel(int fd, const char* if_name);
int ZoopConnectPeer(const char* peer_pub_key_hex, const char* candidates_json, const char* relay_url);
void ZoopNotifyNetworkChange(const char* network_type);
const char* ZoopGetConnectionStatus(void);
void ZoopDisconnect(void);

#ifdef __cplusplus
}
#endif

#endif /* ZOOP_MOBILE_BRIDGE_H */
