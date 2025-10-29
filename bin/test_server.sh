#!/bin/bash

# python3 -m http.serverをCORSにする【Access-Control-Allow-Origin】
# https://qiita.com/relu/items/3461753e3886072349c7
echo "import sys
from http.server import HTTPServer, SimpleHTTPRequestHandler, test

class CORSRequestHandler (SimpleHTTPRequestHandler):
    def end_headers (self):
        self.send_header('Access-Control-Allow-Origin', '*')
        SimpleHTTPRequestHandler.end_headers(self)

if __name__ == '__main__':
    test(CORSRequestHandler, HTTPServer, port=int(sys.argv[1]) if len(sys.argv) > 1 else 52481)" | python3 -- - 52481