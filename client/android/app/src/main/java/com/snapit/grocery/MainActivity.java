package com.snapit.grocery;

import android.os.Build;
import android.os.Bundle;
import android.view.WindowManager;
import androidx.activity.EdgeToEdge;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        if (Build.VERSION.SDK_INT >= 35) {
            // Android 15+ (API 35+) native edge-to-edge enforcement:
            // Avoid calling deprecated setStatusBarColor / setNavigationBarColor / SHORT_EDGES
            WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
            WindowManager.LayoutParams lp = getWindow().getAttributes();
            lp.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_ALWAYS;
            getWindow().setAttributes(lp);
        } else {
            // Android 14 and below: use AndroidX EdgeToEdge backward compatibility
            EdgeToEdge.enable(this);
        }

        super.onCreate(savedInstanceState);

        // Ensure safe window insets dispatch to Capacitor's WebView
        ViewCompat.setOnApplyWindowInsetsListener(getWindow().getDecorView(), (view, windowInsets) -> {
            return ViewCompat.onApplyWindowInsets(view, windowInsets);
        });
    }
}
