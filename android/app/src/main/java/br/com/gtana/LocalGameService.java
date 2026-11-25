package br.com.gtana;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.net.Uri;
import android.os.IBinder;
import android.util.Log;
import java.io.BufferedReader;
import java.io.BufferedOutputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

// Reserva para aparelhos cujo Chrome oferece WebGPU e o WebView ainda não oferece.
// Referência: https://developer.chrome.com/docs/android/trusted-web-activity/overview
public class LocalGameService extends Service {
    static final int PORT = 38765;
    static final String URL = "http://127.0.0.1:" + PORT + "/index.html?mobile=1&android=1&ui=1";
    private ServerSocket server;
    private ExecutorService clients;
    @Override public void onCreate() {
        super.onCreate();
        NotificationManager manager = getSystemService(NotificationManager.class);
        manager.createNotificationChannel(new NotificationChannel("jogo-local", "Jogo no Chrome", NotificationManager.IMPORTANCE_LOW));
        Intent close = new Intent(this, LocalGameService.class).setAction("parar");
        PendingIntent stop = PendingIntent.getService(this, 2, close, PendingIntent.FLAG_IMMUTABLE);
        PendingIntent reopen = PendingIntent.getActivity(this, 1, new Intent(this, MainActivity.class), PendingIntent.FLAG_IMMUTABLE);
        startForeground(1, new Notification.Builder(this, "jogo-local").setSmallIcon(android.R.drawable.ic_media_play)
            .setContentTitle("GTA NA em execução").setContentText("Arquivos locais disponíveis para jogar no Chrome.")
            .setContentIntent(reopen).setOngoing(true).addAction(new Notification.Action.Builder(null, "Encerrar", stop).build()).build());
        clients = Executors.newFixedThreadPool(4);
        new Thread(() -> {
            try {
                server = new ServerSocket(PORT, 8, InetAddress.getByName("127.0.0.1"));
                while (!server.isClosed()) { Socket socket = server.accept(); clients.submit(() -> serve(socket)); }
            } catch (Exception e) { if (server == null || !server.isClosed()) { Log.e("GTA-NA", "Servidor local indisponível", e); stopSelf(); } }
        }, "gta-na-local").start();
    }
    @Override public int onStartCommand(Intent i, int flags, int id) {
        if (i != null && "parar".equals(i.getAction())) stopSelf();
        return START_NOT_STICKY;
    }
    private void serve(Socket socket) {
        try (Socket s = socket) {
            s.setSoTimeout(5000);
            BufferedReader reader = new BufferedReader(new InputStreamReader(s.getInputStream(), StandardCharsets.US_ASCII));
            String request = reader.readLine(); if (request == null || request.length() > 4096) return;
            String[] parts = request.split(" "); if (parts.length < 2 || !(parts[0].equals("GET") || parts[0].equals("HEAD"))) return;
            String host = ""; int length = request.length(); String header;
            while ((header = reader.readLine()) != null && !header.isEmpty()) {
                length += header.length(); if (length > 16384) return;
                if (header.toLowerCase(java.util.Locale.ROOT).startsWith("host:")) host = header.substring(5).trim();
            }
            if (!host.equals("127.0.0.1:" + PORT) && !host.equals("localhost:" + PORT)) return;
            String p = Uri.decode(parts[1].split("\\?", 2)[0]);
            if (!p.startsWith("/") || p.contains("..") || p.contains("\\") || p.contains("\0")) return;
            if (p.equals("/")) p = "/index.html";
            BufferedOutputStream out = new BufferedOutputStream(s.getOutputStream());
            try (InputStream file = getAssets().open("game" + p)) {
                int size = file.available();
                out.write(("HTTP/1.1 200 OK\r\nContent-Type: " + mime(p) + "\r\nContent-Length: " + size + "\r\nConnection: close\r\nX-Content-Type-Options: nosniff\r\n\r\n").getBytes(StandardCharsets.US_ASCII));
                if (!parts[0].equals("HEAD")) { byte[] buffer = new byte[65536]; int n; while ((n = file.read(buffer)) != -1) out.write(buffer, 0, n); }
            } catch (java.io.FileNotFoundException e) { out.write("HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\nConnection: close\r\n\r\n".getBytes(StandardCharsets.US_ASCII)); }
            out.flush();
        } catch (Exception e) { Log.d("GTA-NA", "Conexão local encerrada: " + e.getMessage()); }
    }
    static String mime(String p) {
        if (p.endsWith(".html")) return "text/html";
        if (p.endsWith(".json")) return "application/json";
        if (p.endsWith(".mp3")) return "audio/mpeg";
        if (p.endsWith(".png")) return "image/png";
        if (p.endsWith(".webp")) return "image/webp";
        return "application/octet-stream";
    }
    @Override public void onDestroy() {
        try { if (server != null) server.close(); } catch (Exception ignored) { }
        if (clients != null) clients.shutdownNow(); super.onDestroy();
    }
    @Override public IBinder onBind(Intent intent) { return null; }
}
