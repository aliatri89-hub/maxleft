package app.mymantl;

import android.graphics.Color;
import android.os.Bundle;
import android.view.WindowManager;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Match navigation bar to app background (#0f0d0b) — eliminates
        // the Android system scrim that appears at the bottom in edge-to-edge mode.
        getWindow().setNavigationBarColor(Color.parseColor("#0f0d0b"));
        getWindow().setNavigationBarContrastEnforced(false);
    }
}
