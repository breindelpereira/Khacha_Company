import http.server
import os
import socketserver
import threading
import webbrowser

HOST = os.environ.get("KHACHA_HOST", "127.0.0.1")
START_PORT = int(os.environ.get("KHACHA_PORT", "8080"))
OPEN_BROWSER = os.environ.get("KHACHA_NO_BROWSER") is None


def open_browser(url: str) -> None:
    try:
        webbrowser.open(url)
    except Exception as exc:
        print(f"Could not open a browser automatically: {exc}")


class NoCacheHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()


def bind_server():
    """Bind to the first free port starting at START_PORT."""
    last_error = None
    for port in range(START_PORT, START_PORT + 20):
        try:
            return socketserver.TCPServer((HOST, port), NoCacheHTTPRequestHandler), port
        except OSError as exc:
            last_error = exc
    raise last_error


socketserver.TCPServer.allow_reuse_address = True
try:
    httpd, port = bind_server()
    url = f"http://localhost:{port}/"
    with httpd:
        print(f"Khacha Company HTTP Server active at {url} (no-cache enabled, Ctrl+C to stop)")
        if OPEN_BROWSER:
            threading.Thread(target=open_browser, args=(url,), daemon=True).start()
        httpd.serve_forever()
except KeyboardInterrupt:
    print("\nServer stopped.")
except Exception as e:
    print(f"Server error: {e}")
