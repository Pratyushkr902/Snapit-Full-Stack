package com.snapit.grocery;

import android.os.Bundle;
import android.webkit.WebView;
import androidx.activity.EdgeToEdge;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        try {
            EdgeToEdge.enable(this);
        } catch (Throwable ignored) {
            // Graceful fallback on older Android versions or unsupported devices
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
