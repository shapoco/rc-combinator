#!/usr/bin/env python3

import re
import os
import hashlib
import argparse

parser = argparse.ArgumentParser()
parser.add_argument('-d', '--base_dir', required=True)
parser.add_argument('-u', '--base_url', required=False)
parser.add_argument('-f', '--file', required=True)
args = parser.parse_args()

def main() -> None:
    base_dir = os.path.abspath(args.base_dir)
    if base_dir.endswith('/'):
        base_dir = base_dir[:-1]
        print(base_dir)

    os.chdir(base_dir)

    file_path = os.path.abspath(args.file)

    with open(file_path) as f:
        html = f.read()

    os.chdir(os.path.dirname(file_path))
    
    html = fix_url(base_dir, html, r'<script\s[^>]*src="([^"]+)"[^>]*>', 1)
    html = fix_url(base_dir, html, r'<link\s[^>]*href="([^"]+)"[^>]*>', 1)
    html = fix_url(base_dir, html, r'<meta\s+property="og:image"\s+[^>]*content="([^"]+)"[^>]*>', 1)
    html = fix_url(base_dir, html, r'fetch\s*\(\s*["\']([^\'"]+)["\']\s*\)', 1)
    html = fix_url(base_dir, html, r'locateFile\s*\(\s*["\']([^\'"]+)["\']\s*\)', 1)
    html = fix_url(base_dir, html, r'new\s+Worker\s*\(\s*["\']([^\'"]+)["\']\s*', 1)
    html = fix_url(base_dir, html, r'import.+from\s*["\']([^\'"]+)["\']', 1)
    
    os.chdir(base_dir)

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
        elif args.base_url and path.startswith(args.base_url):
            abs_path = os.path.join(base_dir, path[len(args.base_url):])
        elif path.startswith('.'):
            abs_path = os.path.join(os.getcwd(), path)
        else:
            tmp = os.path.join(os.getcwd(), path)
            if os.path.exists(tmp):
                abs_path = tmp
            
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
