#!/usr/bin/env python3
"""
NEON ARCADE launcher.

The full game site in site/ cannot run from a file:// URL -- browsers block
the asset requests those games make. So this serves the folder over
http://localhost instead and opens it. Nothing leaves your machine: the
server binds to 127.0.0.1 and is only reachable from this computer.

Run:  python3 serve.py     (or just use one of the START- scripts)
"""
import http.server
import os
import socket
import socketserver
import sys
import threading
import webbrowser

ROOT = os.path.dirname(os.path.abspath(__file__))
PREFERRED = 8099


def free_port(start):
    for port in range(start, start + 40):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            try:
                s.bind(("127.0.0.1", port))
                return port
            except OSError:
                continue
    return None


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def log_message(self, *a):
        pass  # keep the console quiet

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


def main():
    port = free_port(PREFERRED)
    if port is None:
        print("Could not find a free port between %d and %d." % (PREFERRED, PREFERRED + 40))
        return 1

    url = "http://127.0.0.1:%d/index.html" % port
    print("")
    print("  NEON ARCADE is running.")
    print("")
    print("    %s" % url)
    print("")
    print("  Your browser should open by itself. If it doesn't, paste that")
    print("  address into it. Leave this window open while you play;")
    print("  close it (or press Ctrl+C) when you're done.")
    print("")

    threading.Timer(1.0, lambda: webbrowser.open(url)).start()

    socketserver.TCPServer.allow_reuse_address = True
    try:
        with socketserver.TCPServer(("127.0.0.1", port), Handler) as httpd:
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n  Stopped. Bye.\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
