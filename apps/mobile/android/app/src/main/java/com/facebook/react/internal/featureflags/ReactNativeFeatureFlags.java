package com.facebook.react.internal.featureflags;

/**
 * Stub implementation of ReactNativeFeatureFlags to avoid missing native library issues
 * This disables all experimental features to ensure compatibility
 */
public class ReactNativeFeatureFlags {
    public static boolean enableBridgelessArchitecture() {
        return false;
    }
    
    public static boolean enableFabricRenderer() {
        return false;
    }
    
    public static boolean enableConcurrentRoot() {
        return false;
    }
    
    public static boolean enableTurboModules() {
        return false;
    }
}