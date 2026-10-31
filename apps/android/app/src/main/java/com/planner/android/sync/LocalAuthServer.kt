package com.planner.android.sync

import android.content.Context
import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.ServerSocket
import java.net.Socket

object LocalAuthServer {
    private const val TAG = "LocalAuthServer"
    private const val PORT = 3000
    private var serverJob: Job? = null
    private var serverSocket: ServerSocket? = null

    @Synchronized
    fun start(context: Context) {
        stop()

        serverJob = CoroutineScope(Dispatchers.IO).launch {
            try {
                val server = ServerSocket(PORT)
                serverSocket = server
                Log.d(TAG, "LocalAuthServer started on port $PORT")

                // Keep accepting connections until authenticated or timeout (3 minutes max)
                val timeoutJob = launch {
                    kotlinx.coroutines.delay(180_000)
                    stop()
                }

                while (!server.isClosed) {
                    try {
                        val clientSocket = server.accept()
                        handleClient(clientSocket)
                    } catch (e: Exception) {
                        if (server.isClosed) break
                        Log.e(TAG, "Error accepting client", e)
                    }
                }
                timeoutJob.cancel()
            } catch (e: Exception) {
                Log.e(TAG, "Failed to start LocalAuthServer on port $PORT", e)
            }
        }
    }

    private fun handleClient(socket: Socket) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val reader = BufferedReader(InputStreamReader(socket.getInputStream(), Charsets.UTF_8))
                val firstLine = reader.readLine() ?: ""
                Log.d(TAG, "Request received: $firstLine")

                val html = """
                    <!DOCTYPE html>
                    <html lang="en">
                    <head>
                        <meta charset="utf-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1">
                        <title>Second Brain Authentication</title>
                        <style>
                            * { box-sizing: border-box; margin: 0; padding: 0; }
                            body {
                                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                                background-color: #0A0D14;
                                color: #F8FAFC;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                min-height: 100vh;
                                padding: 24px;
                            }
                            .card {
                                background-color: #131B2E;
                                border: 1px solid #1E293B;
                                border-radius: 24px;
                                padding: 36px 28px;
                                max-width: 420px;
                                width: 100%;
                                text-align: center;
                                box-shadow: 0 20px 40px rgba(0,0,0,0.6);
                            }
                            .icon {
                                font-size: 48px;
                                margin-bottom: 20px;
                            }
                            h2 {
                                font-size: 22px;
                                font-weight: 700;
                                margin-bottom: 8px;
                                color: #FFFFFF;
                            }
                            p {
                                font-size: 14px;
                                color: #94A3B8;
                                line-height: 1.6;
                                margin-bottom: 24px;
                            }
                            .btn {
                                display: block;
                                width: 100%;
                                padding: 14px;
                                background: linear-gradient(135deg, #2563EB, #4F46E5);
                                color: #FFFFFF;
                                font-weight: 600;
                                font-size: 15px;
                                border-radius: 14px;
                                text-decoration: none;
                                box-shadow: 0 4px 15px rgba(37, 99, 235, 0.4);
                                transition: transform 0.1s ease;
                            }
                            .btn:active {
                                transform: scale(0.98);
                            }
                        </style>
                    </head>
                    <body>
                        <div class="card">
                            <div class="icon">🧠</div>
                            <h2>Signed In Successfully!</h2>
                            <p>Connecting your Google account with Second Brain...</p>
                            <a id="open-app" href="#" class="btn">Tap to Return to Second Brain</a>
                        </div>
                        <script>
                            const hash = window.location.hash || '';
                            const search = window.location.search || '';
                            const queryFromHash = hash.startsWith('#') ? '?' + hash.substring(1) : '';
                            const finalParams = search ? (search + (hash ? '&' + hash.substring(1) : '')) : queryFromHash;
                            const target = 'secondbrain://auth-callback' + finalParams + hash;
                            
                            const btn = document.getElementById('open-app');
                            btn.href = target;
                            
                            // Auto redirect
                            setTimeout(function() {
                                window.location.replace(target);
                            }, 300);
                        </script>
                    </body>
                    </html>
                """.trimIndent()

                val writer = OutputStreamWriter(socket.getOutputStream(), Charsets.UTF_8)
                writer.write("HTTP/1.1 200 OK\r\n")
                writer.write("Content-Type: text/html; charset=utf-8\r\n")
                writer.write("Content-Length: ${html.toByteArray(Charsets.UTF_8).size}\r\n")
                writer.write("Connection: close\r\n")
                writer.write("\r\n")
                writer.write(html)
                writer.flush()
                socket.close()

                // Once we served the redirect page, give the browser a brief moment to redirect then stop
                kotlinx.coroutines.delay(2000)
                stop()
            } catch (e: Exception) {
                Log.e(TAG, "Error handling client response", e)
            }
        }
    }

    @Synchronized
    fun stop() {
        try {
            serverSocket?.close()
        } catch (_: Exception) {}
        serverSocket = null
        serverJob?.cancel()
        serverJob = null
    }
}
