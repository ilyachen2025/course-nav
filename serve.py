"""课程资料导航 · 本地预览服务器
用 pythonw 后台常驻运行，日志写入 _serve.log（pythonw 无控制台，必须重定向输出）。
"""
import os
import sys
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

BASE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(BASE, "site")
LOG = os.path.join(BASE, "_serve.log")
PORT = 8000

log = open(LOG, "a", encoding="utf-8", buffering=1)
sys.stdout = log
sys.stderr = log


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def log_message(self, fmt, *args):
        log.write("%s - %s\n" % (self.address_string(), fmt % args))


if __name__ == "__main__":
    server = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    log.write("serving %s on http://127.0.0.1:%d/\n" % (ROOT, PORT))
    server.serve_forever()
