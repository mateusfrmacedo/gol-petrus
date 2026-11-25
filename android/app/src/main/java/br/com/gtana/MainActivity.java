package br.com.gtana;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.graphics.Color;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.net.Uri;
import android.os.Bundle;
import android.os.Build;
import android.os.SystemClock;
import android.view.Surface;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.ConsoleMessage;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.Collections;

// Conteúdo local sob origem HTTPS; nenhum arquivo do armazenamento pessoal é exposto.
public class MainActivity extends Activity implements SensorEventListener {
    private static final String HOST = "appassets.androidplatform.net";
    private static final String START = "https://" + HOST + "/game/index.html?mobile=1&android=1&ui=1";
    private WebView web;
    private SensorManager sensors;
    private Sensor gravity;
    private long lastSensor;
    private boolean errorShown;
    private View customView;
    private WebChromeClient.CustomViewCallback fullscreenCallback;

    @Override public void onCreate(Bundle saved) {
        super.onCreate(saved);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        getWindow().getAttributes().layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
        getWindow().setNavigationBarColor(Color.BLACK);
        getWindow().setStatusBarColor(Color.BLACK);
        web = new WebView(this); web.setBackgroundColor(Color.BLACK); setContentView(web);
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
        WebSettings s = web.getSettings(); s.setJavaScriptEnabled(true); s.setDomStorageEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(true); s.setAllowFileAccess(false); s.setAllowContentAccess(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW); s.setSupportZoom(false);
        web.addJavascriptInterface(new NativeBridge(), "GtaAndroid");
        web.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest r) {
                Uri u = r.getUrl();
                if (!HOST.equals(u.getHost()) || !"https".equals(u.getScheme())) return null;
                String p = u.getPath();
                if (p == null || !p.startsWith("/game/") || p.contains("..") || p.contains("\\")) return missing();
                try { return new WebResourceResponse(LocalGameService.mime(p), "UTF-8", 200, "OK", Collections.singletonMap("Cache-Control", "no-cache"), getAssets().open(p.substring(1))); }
                catch (IOException e) { return missing(); }
            }
            @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                return !HOST.equals(r.getUrl().getHost()) || !"https".equals(r.getUrl().getScheme());
            }
            @Override public void onPageFinished(WebView v, String url) { immersive(); }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onConsoleMessage(ConsoleMessage m) {
                android.util.Log.d("GTA-NA", m.message()); return true;
            }
            @Override public void onShowCustomView(View view, CustomViewCallback cb) {
                customView = view; fullscreenCallback = cb; setContentView(view); immersive();
            }
            @Override public void onHideCustomView() {
                if (customView == null) return;
                setContentView(web); customView = null; fullscreenCallback.onCustomViewHidden(); immersive();
            }
        });
        sensors = (SensorManager) getSystemService(SENSOR_SERVICE);
        gravity = sensors.getDefaultSensor(Sensor.TYPE_GRAVITY);
        if (gravity == null) gravity = sensors.getDefaultSensor(Sensor.TYPE_ACCELEROMETER);
        if (Build.VERSION.SDK_INT >= 33) getOnBackInvokedDispatcher().registerOnBackInvokedCallback(android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT, this::handleBack);
        web.loadUrl(START); immersive();
    }
    private static WebResourceResponse missing() {
        return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found", Collections.emptyMap(), new ByteArrayInputStream(new byte[0]));
    }
    private void immersive() {
        getWindow().setDecorFitsSystemWindows(false);
        WindowInsetsController c = getWindow().getInsetsController();
        if (c != null) { c.hide(WindowInsets.Type.systemBars()); c.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE); }
    }
    @Override protected void onResume() {
        super.onResume(); web.onResume(); immersive();
        if (gravity != null) sensors.registerListener(this, gravity, SensorManager.SENSOR_DELAY_GAME);
    }
    @Override protected void onPause() {
        web.evaluateJavascript("window.dispatchEvent(new Event('gta-na-background'))", null);
        sensors.unregisterListener(this); web.onPause(); super.onPause();
    }
    @Override protected void onDestroy() { sensors.unregisterListener(this); web.removeJavascriptInterface("GtaAndroid"); web.destroy(); super.onDestroy(); }
    @Override public void onWindowFocusChanged(boolean focus) { super.onWindowFocusChanged(focus); if (focus) immersive(); }
    // Android 12 usa o método legado; Android 13+ usa o dispatcher nativo registrado acima.
    @SuppressLint("GestureBackNavigation")
    @Override public void onBackPressed() { handleBack(); }
    private void handleBack() {
        if (customView != null) { web.getWebChromeClient().onHideCustomView(); return; }
        web.evaluateJavascript("window.gtaNativeBack ? window.gtaNativeBack() : false", result -> {
            if (!"true".equals(result)) new AlertDialog.Builder(this).setTitle("Sair do GTA NA?")
                .setNegativeButton("Continuar", null).setPositiveButton("Sair", (d, w) -> { stopService(new Intent(this, LocalGameService.class)); finish(); }).show();
        });
    }
    @Override public void onSensorChanged(SensorEvent e) {
        long now = SystemClock.elapsedRealtime(); if (now - lastSensor < 33) return; lastSensor = now;
        int rotation = getDisplay().getRotation();
        double horizontal = rotation == Surface.ROTATION_90 ? e.values[1] : rotation == Surface.ROTATION_270 ? -e.values[1] : e.values[0];
        double norm = Math.sqrt(e.values[0]*e.values[0] + e.values[1]*e.values[1] + e.values[2]*e.values[2]);
        if (norm < 1) return;
        double tilt = Math.toDegrees(Math.asin(Math.max(-1, Math.min(1, horizontal / norm))));
        web.evaluateJavascript("window.dispatchEvent(new CustomEvent('gta-na-tilt',{detail:" + tilt + "}))", null);
    }
    @Override public void onAccuracyChanged(Sensor sensor, int accuracy) { }
    private void openChrome() {
        startForegroundService(new Intent(this, LocalGameService.class));
        // O servidor usa porta fixa local e só atende os recursos incluídos no APK.
        web.postDelayed(() -> {
            Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse(LocalGameService.URL));
            Bundle session = new Bundle(); session.putBinder("android.support.customtabs.extra.SESSION", null); i.putExtras(session);
            i.putExtra("android.support.customtabs.extra.TOOLBAR_COLOR", Color.BLACK);
            i.setPackage("com.android.chrome");
            try { startActivity(i); } catch (android.content.ActivityNotFoundException ex) { i.setPackage(null); try { startActivity(i); } catch (android.content.ActivityNotFoundException absent) { new AlertDialog.Builder(this).setMessage("Instale ou atualize o Google Chrome para usar este modo.").setPositiveButton("OK", null).show(); } }
        }, 500);
    }
    private final class NativeBridge {
        @JavascriptInterface public void unavailable(String reason) {
            runOnUiThread(() -> {
                if (errorShown || isFinishing()) return; errorShown = true;
                new AlertDialog.Builder(MainActivity.this).setTitle("Compatibilidade gráfica")
                    .setMessage("Este Android System WebView não conseguiu iniciar o motor gráfico. Atualize o WebView e o Chrome. Você também pode testar os mesmos arquivos locais no Chrome.\n\n" + reason)
                    .setPositiveButton("Testar no Chrome", (d, w) -> openChrome()).setNeutralButton("Tentar novamente", (d, w) -> { errorShown = false; web.reload(); }).setNegativeButton("Fechar", (d, w) -> { stopService(new Intent(MainActivity.this, LocalGameService.class)); finish(); }).show();
            });
        }
    }
}
