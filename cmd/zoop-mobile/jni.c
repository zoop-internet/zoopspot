#include <jni.h>
#include <stdlib.h>
#include <string.h>
#include <android/log.h>
#include <pthread.h>
#include <unistd.h>

extern int goInitMobile(const char* configJSON);
extern int goStartTunnel(int fd, const char* ifName);
extern int goConnectPeer(const char* peerPubKey, const char* candidatesJSON, const char* relayURL);
extern void goNotifyNetworkChange(const char* networkType);
extern void goSetPowerSavingMode(int enabled);
extern char* goGetConnectionStatus(void);
extern void goFreeString(char* str);
extern void goDisconnect(void);

static JavaVM* g_jvm = NULL;
static jobject g_callback = NULL;

static int pfd[2];
static pthread_t log_thread;

static void* logger_loop(void* arg) {
    ssize_t n;
    char buf[1024];
    while ((n = read(pfd[0], buf, sizeof(buf) - 1)) > 0) {
        buf[n] = 0;
        __android_log_write(ANDROID_LOG_INFO, "ZoopGo", buf);
    }
    return NULL;
}

static void redirect_std_to_logcat(void) {
    setvbuf(stdout, 0, _IONBF, 0);
    setvbuf(stderr, 0, _IONBF, 0);
    if (pipe(pfd) == 0) {
        dup2(pfd[1], 1);
        dup2(pfd[1], 2);
        pthread_create(&log_thread, NULL, logger_loop, NULL);
        pthread_detach(log_thread);
    }
}

JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM* vm, void* reserved) {
    g_jvm = vm;
    redirect_std_to_logcat();
    __android_log_write(ANDROID_LOG_INFO, "ZoopJNI", "libzoop.so JNI_OnLoad initialized");
    return JNI_VERSION_1_6;
}

static JNIEnv* getJNIEnv(int* attached) {
    if (!g_jvm) return NULL;
    JNIEnv* env = NULL;
    *attached = 0;
    jint res = (*g_jvm)->GetEnv(g_jvm, (void**)&env, JNI_VERSION_1_6);
    if (res == JNI_EDETACHED) {
        if ((*g_jvm)->AttachCurrentThread(g_jvm, &env, NULL) != 0) {
            return NULL;
        }
        *attached = 1;
    } else if (res != JNI_OK) {
        return NULL;
    }
    return env;
}

void cOnStateChange(const char* state, const char* endpoint, int isDirect) {
    if (!g_jvm || !g_callback) return;
    int attached = 0;
    JNIEnv* env = getJNIEnv(&attached);
    if (!env) return;

    jclass cbClass = (*env)->GetObjectClass(env, g_callback);
    if (cbClass) {
        jmethodID mid = (*env)->GetMethodID(env, cbClass, "onStateChange", "(Ljava/lang/String;Ljava/lang/String;Z)V");
        if ((*env)->ExceptionCheck(env)) {
            (*env)->ExceptionClear(env);
            mid = NULL;
        }
        if (mid) {
            jstring jState = (*env)->NewStringUTF(env, state ? state : "");
            jstring jEndpoint = (*env)->NewStringUTF(env, endpoint ? endpoint : "");
            (*env)->CallVoidMethod(env, g_callback, mid, jState, jEndpoint, (jboolean)(isDirect ? JNI_TRUE : JNI_FALSE));
            if ((*env)->ExceptionCheck(env)) {
                (*env)->ExceptionClear(env);
            }
            if (jState) (*env)->DeleteLocalRef(env, jState);
            if (jEndpoint) (*env)->DeleteLocalRef(env, jEndpoint);
        }
        (*env)->DeleteLocalRef(env, cbClass);
    }

    if (attached) {
        (*g_jvm)->DetachCurrentThread(g_jvm);
    }
}

void cOnError(const char* errorCode, const char* message) {
    if (!g_jvm || !g_callback) return;
    int attached = 0;
    JNIEnv* env = getJNIEnv(&attached);
    if (!env) return;

    jclass cbClass = (*env)->GetObjectClass(env, g_callback);
    if (cbClass) {
        jmethodID mid = (*env)->GetMethodID(env, cbClass, "onError", "(Ljava/lang/String;Ljava/lang/String;)V");
        if ((*env)->ExceptionCheck(env)) {
            (*env)->ExceptionClear(env);
            mid = NULL;
        }
        if (mid) {
            jstring jCode = (*env)->NewStringUTF(env, errorCode ? errorCode : "");
            jstring jMsg = (*env)->NewStringUTF(env, message ? message : "");
            (*env)->CallVoidMethod(env, g_callback, mid, jCode, jMsg);
            if ((*env)->ExceptionCheck(env)) {
                (*env)->ExceptionClear(env);
            }
            if (jCode) (*env)->DeleteLocalRef(env, jCode);
            if (jMsg) (*env)->DeleteLocalRef(env, jMsg);
        }
        (*env)->DeleteLocalRef(env, cbClass);
    }

    if (attached) {
        (*g_jvm)->DetachCurrentThread(g_jvm);
    }
}

int cOnProtectSocket(int fd) {
    if (!g_jvm || !g_callback) return 0;
    int attached = 0;
    JNIEnv* env = getJNIEnv(&attached);
    if (!env) return 0;

    int success = 0;
    jclass cbClass = (*env)->GetObjectClass(env, g_callback);
    if (cbClass) {
        jmethodID mid = (*env)->GetMethodID(env, cbClass, "onProtectSocket", "(I)Z");
        if ((*env)->ExceptionCheck(env)) {
            (*env)->ExceptionClear(env);
            mid = NULL;
        }
        if (mid) {
            jboolean res = (*env)->CallBooleanMethod(env, g_callback, mid, (jint)fd);
            if ((*env)->ExceptionCheck(env)) {
                (*env)->ExceptionClear(env);
            } else {
                success = (res == JNI_TRUE) ? 1 : 0;
            }
        }
        (*env)->DeleteLocalRef(env, cbClass);
    }

    if (attached) {
        (*g_jvm)->DetachCurrentThread(g_jvm);
    }
    return success;
}

JNIEXPORT jint JNICALL Java_network_zoop_app_vpn_ZoopMobileBridge_initMobile(
    JNIEnv* env, jobject thiz, jstring configJson, jobject callback
) {
    const char* cConfig = NULL;
    if (configJson) {
        cConfig = (*env)->GetStringUTFChars(env, configJson, NULL);
    }

    if (g_callback) {
        (*env)->DeleteGlobalRef(env, g_callback);
        g_callback = NULL;
    }
    if (callback) {
        g_callback = (*env)->NewGlobalRef(env, callback);
    }

    int res = goInitMobile(cConfig);

    if (configJson && cConfig) {
        (*env)->ReleaseStringUTFChars(env, configJson, cConfig);
    }
    return res;
}

JNIEXPORT jint JNICALL Java_network_zoop_app_vpn_ZoopMobileBridge_startTunnel(
    JNIEnv* env, jobject thiz, jint fd, jstring ifName
) {
    const char* cName = NULL;
    if (ifName) {
        cName = (*env)->GetStringUTFChars(env, ifName, NULL);
    }
    int res = goStartTunnel((int)fd, cName);
    if (ifName && cName) {
        (*env)->ReleaseStringUTFChars(env, ifName, cName);
    }
    return res;
}

JNIEXPORT jint JNICALL Java_network_zoop_app_vpn_ZoopMobileBridge_connectPeer(
    JNIEnv* env, jobject thiz, jstring peerPubKeyHex, jstring candidatesJson, jstring relayUrl
) {
    const char* cKey = peerPubKeyHex ? (*env)->GetStringUTFChars(env, peerPubKeyHex, NULL) : NULL;
    const char* cCand = candidatesJson ? (*env)->GetStringUTFChars(env, candidatesJson, NULL) : NULL;
    const char* cRelay = relayUrl ? (*env)->GetStringUTFChars(env, relayUrl, NULL) : NULL;

    int res = goConnectPeer(cKey, cCand, cRelay);

    if (peerPubKeyHex && cKey) (*env)->ReleaseStringUTFChars(env, peerPubKeyHex, cKey);
    if (candidatesJson && cCand) (*env)->ReleaseStringUTFChars(env, candidatesJson, cCand);
    if (relayUrl && cRelay) (*env)->ReleaseStringUTFChars(env, relayUrl, cRelay);
    return res;
}

JNIEXPORT void JNICALL Java_network_zoop_app_vpn_ZoopMobileBridge_notifyNetworkChange(
    JNIEnv* env, jobject thiz, jstring networkType
) {
    const char* cNet = networkType ? (*env)->GetStringUTFChars(env, networkType, NULL) : NULL;
    goNotifyNetworkChange(cNet);
    if (networkType && cNet) (*env)->ReleaseStringUTFChars(env, networkType, cNet);
}

JNIEXPORT void JNICALL Java_network_zoop_app_vpn_ZoopMobileBridge_setPowerSavingMode(
    JNIEnv* env, jobject thiz, jboolean enabled
) {
    goSetPowerSavingMode(enabled == JNI_TRUE ? 1 : 0);
}

JNIEXPORT jstring JNICALL Java_network_zoop_app_vpn_ZoopMobileBridge_getConnectionStatus(
    JNIEnv* env, jobject thiz
) {
    char* cStatus = goGetConnectionStatus();
    jstring res = (*env)->NewStringUTF(env, cStatus ? cStatus : "{}");
    if (cStatus) {
        goFreeString(cStatus);
    }
    return res;
}

JNIEXPORT void JNICALL Java_network_zoop_app_vpn_ZoopMobileBridge_disconnect(
    JNIEnv* env, jobject thiz
) {
    goDisconnect();
}
