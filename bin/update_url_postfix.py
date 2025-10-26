#!/usr/bin/env python3

import re
import os
import hashlib
import argparse

parser = argparse.ArgumentParser()
parser.add_argument('-d', '--dir', required=True)
parser.add_argument('-f', '--file', required=True)
parser.add_argument('-u', '--url', required=True)
args = parser.parse_args()


def main() -> None:
    last_curdir = os.getcwd()
    
    with open(args.file) as f:
        html = f.read()
    
    os.chdir(os.path.dirname(args.dir))
    base_dir = os.getcwd()
    if base_dir.endswith('/'):
        base_dir = base_dir[:-1]
        print(base_dir)
    os.chdir(last_curdir)
    
    os.chdir(os.path.dirname(args.file))
    
    html = fix_url(base_dir, html, r'<script\s[^>]*src="([^"]+)"[^>]*>', 1)
    html = fix_url(base_dir, html, r'<link\s[^>]*href="([^"]+)"[^>]*>', 1)
    html = fix_url(base_dir, html, r'fetch\s*\(\s*["\']([^\'"]+)["\']\s*\)', 1)
    html = fix_url(base_dir, html, r'import.+from\s*["\']([^\'"]+)["\']', 1)
    
    os.chdir(last_curdir)

    with open(args.file, 'w') as f:
        f.write(html)

def fix_url(base_dir: str, in_html: str, pattern: re.Pattern, group: int = 1) -> str:
    last_end = 0
    out_html = ''
    for mtag in re.finditer(pattern, in_html):
        out_html += in_html[last_end:mtag.start(0)]
            
        # 古いポストフィクスを削除
        path = re.sub(r'\?[\w_]+$', '', mtag[group])
        
        # 絶対パスの生成
        abs_path = None
        if path.startswith('/'):
            abs_path = os.path.join(base_dir, path[1:])
        elif path.startswith('.'):
            abs_path = os.path.join(os.getcwd(), path)
        elif args.url and path.startswith(args.url):
            abs_path = os.path.join(base_dir, path[len(args.url):])
            
        if abs_path:
            # 対象ファイルのハッシュを計算してパスを更新
            with open(abs_path, 'rb') as f:
                postfix = hashlib.sha256(f.read()).hexdigest()[:8]
            path = f'{path}?{postfix}'
            out_html += in_html[mtag.start(0):mtag.start(group)]
            out_html += path
            out_html += in_html[mtag.end(group):mtag.end(0)]
        else:
            # 相対バスでない場合は変更しない
            out_html += in_html[mtag.start(0):mtag.end(0)]
            
        last_end = mtag.end(0)
    out_html += in_html[last_end:]
    return out_html

main()
