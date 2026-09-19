package com.snapit.grocery;

import android.os.Build;
import android.os.Bundle;
import android.view.WindowManager;
import android.webkit.WebView;
import androidx.activity.EdgeToEdge;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        try {
            if (Build.VERSION.SDK_INT >= 35) {
                // Android 15+ (API 35+) native edge-to-edge
                WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
                WindowManager.LayoutParams lp = getWindow().getAttributes();
                if (lp != null) {
                    lp.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_ALWAYS;
                    getWindow().setAttributes(lp);
                }
            } else {
                // Android 14 and below
                EdgeToEdge.enable(this);
            }
        } catch (Throwable ignored) {
            // Prevent vendor-specific ROM display cutout / insets crash on startup
        }

        super.onCreate(savedInstanceState);
    }

    @Override
    public void onStart() {
        super.onStart();
        try {
            if (this.bridge != null && this.bridge.getWebView() != null) {
                WebView webView = this.bridge.getWebView();
                webView.setOverScrollMode(WebView.OVER_SCROLL_IF_CONTENT_SCROLLS);
                webView.setVerticalScrollBarEnabled(false);
                webView.setHorizontalScrollBarEnabled(false);
            }
        } catch (Throwable ignored) {
        }
    }
}
