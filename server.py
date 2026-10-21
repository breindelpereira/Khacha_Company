import http.server
import socketserver
import threading
import webbrowser

PORT = 8080
URL = f"http://localhost:{PORT}/"


def open_browser() -> None:
    try:
        webbrowser.open(URL)
    except Exception as exc:
        print(f"Could not open a browser automatically: {exc}")

class NoCacheHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

socketserver.TCPServer.allow_reuse_address = True
try:
    with socketserver.TCPServer(("", PORT), NoCacheHTTPRequestHandler) as httpd:
        print(f"Khacha Company HTTP Server active at {URL} (no-cache enabled)")
        threading.Thread(target=open_browser, daemon=True).start()
        httpd.serve_forever()
except Exception as e:
    print(f"Server error: {e}")
