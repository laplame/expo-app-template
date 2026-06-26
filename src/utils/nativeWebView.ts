import type { ComponentType } from 'react';
import { UIManager } from 'react-native';
import type { WebViewProps } from 'react-native-webview';

/** Evita importar react-native-webview si el binario nativo no lo incluye (crashea al require). */
export function isNativeWebViewAvailable(): boolean {
  try {
    return UIManager.getViewManagerConfig('RNCWebView') != null;
  } catch {
    return false;
  }
}

export function loadNativeWebViewComponent(): ComponentType<WebViewProps> | null {
  if (!isNativeWebViewAvailable()) return null;
  try {
    return require('react-native-webview').WebView;
  } catch {
    return null;
  }
}
