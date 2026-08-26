import http.server
import os
import sys
import json
import socketserver
import mimetypes
import threading

try:
    sys.stdout.reconfigure(encoding='utf-8', errors='ignore')
    sys.stderr.reconfigure(encoding='utf-8', errors='ignore')
except Exception:
    pass

PORT = int(os.environ.get('PORT', 5173))
ROOT = os.path.dirname(os.path.abspath(__file__))
ORDERS_FILE = os.path.join(ROOT, 'orders_db.json')
db_lock = threading.Lock()

mimetypes.add_type('application/javascript', '.js')
mimetypes.add_type('application/javascript', '.mjs')
mimetypes.add_type('text/css', '.css')
mimetypes.add_type('image/svg+xml', '.svg')
mimetypes.add_type('image/webp', '.webp')
mimetypes.add_type('image/avif', '.avif')
mimetypes.add_type('font/woff2', '.woff2')
mimetypes.add_type('font/woff', '.woff')

def get_orders():
    with db_lock:
        if not os.path.exists(ORDERS_FILE):
            return []
        try:
            with open(ORDERS_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                return data if isinstance(data, list) else []
        except Exception as e:
            print('Error reading orders_db.json:', e)
            return []

def save_orders(orders_list):
    with db_lock:
        try:
            tmp_file = ORDERS_FILE + '.tmp'
            with open(tmp_file, 'w', encoding='utf-8') as f:
                json.dump(orders_list, f, ensure_ascii=False, indent=2)
            if os.path.exists(ORDERS_FILE):
                os.replace(tmp_file, ORDERS_FILE)
            else:
                os.rename(tmp_file, ORDERS_FILE)
            return True
        except Exception as e:
            print('Error writing orders_db.json:', e)
            return False

def add_or_update_order(order):
    order_id = order.get('id') or order.get('orderNo')
    if not order_id:
        return False
    with db_lock:
        orders = []
        if os.path.exists(ORDERS_FILE):
            try:
                with open(ORDERS_FILE, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    orders = data if isinstance(data, list) else []
            except Exception:
                orders = []
        
        idx = next((i for i, o in enumerate(orders) if (o.get('id') == order_id or o.get('orderNo') == order_id)), -1)
        if idx >= 0:
            orders[idx] = {**orders[idx], **order}
        else:
            orders.insert(0, order)
        
        try:
            tmp_file = ORDERS_FILE + '.tmp'
            with open(tmp_file, 'w', encoding='utf-8') as f:
                json.dump(orders, f, ensure_ascii=False, indent=2)
            if os.path.exists(ORDERS_FILE):
                os.replace(tmp_file, ORDERS_FILE)
            else:
                os.rename(tmp_file, ORDERS_FILE)
            return True
        except Exception as e:
            print('Error writing orders_db.json in add_or_update_order:', e)
            return False

class SpaHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def send_cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Pragma, Cache-Control')

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_cors_headers()
        self.end_headers()

    def do_GET(self):
        clean_path = self.path.split('?')[0]

        # API Endpoints
        if clean_path == '/api/orders' or clean_path == '/api/orders.json':
            orders = get_orders()
            data = json.dumps(orders, ensure_ascii=False).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(data)))
            self.send_header('Cache-Control', 'no-cache')
            self.send_cors_headers()
            self.end_headers()
            self.wfile.write(data)
            return

        if clean_path == '/':
            clean_path = '/index.html'

        # Prevent Path Traversal
        file_path = os.path.normpath(os.path.join(ROOT, clean_path.lstrip('/')))
        if not file_path.startswith(ROOT):
            self.send_error(403, 'Forbidden')
            return

        if not os.path.exists(file_path):
            dist_path = os.path.normpath(os.path.join(ROOT, 'dist', clean_path.lstrip('/')))
            if os.path.exists(dist_path) and os.path.isfile(dist_path):
                file_path = dist_path

        if not os.path.exists(file_path) or os.path.isdir(file_path):
            _, ext = os.path.splitext(clean_path)
            if not ext or ext == '.html':
                fallback_index = os.path.join(ROOT, 'index.html')
                if not os.path.exists(fallback_index):
                    fallback_index = os.path.join(ROOT, 'dist', 'index.html')
                file_path = fallback_index

        if os.path.exists(file_path) and os.path.isfile(file_path):
            mime_type, _ = mimetypes.guess_type(file_path)
            if not mime_type:
                mime_type = 'application/octet-stream'

            try:
                with open(file_path, 'rb') as f:
                    content = f.read()
                self.send_response(200)
                self.send_header('Content-Type', mime_type)
                self.send_header('Content-Length', str(len(content)))
                self.send_header('Cache-Control', 'no-cache')
                self.send_cors_headers()
                self.end_headers()
                self.wfile.write(content)
            except Exception as e:
                self.send_error(500, f'Server Error: {e}')
        else:
            self.send_error(404, 'File Not Found')

    def do_POST(self):
        clean_path = self.path.split('?')[0]
        if clean_path == '/api/orders' or clean_path == '/api/orders.json':
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            try:
                order = json.loads(body.decode('utf-8'))
                add_or_update_order(order)
                resp = json.dumps({'success': True, 'order': order}, ensure_ascii=False).encode('utf-8')
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Content-Length', str(len(resp)))
                self.send_cors_headers()
                self.end_headers()
                self.wfile.write(resp)
                print(f"[SERVER] New order saved: #{order.get('orderNo', order.get('id'))} from {order.get('name')}")
            except Exception as e:
                self.send_error(400, f'Invalid JSON: {e}')
            return
        self.send_error(404, 'Endpoint Not Found')

    def do_PUT(self):
        clean_path = self.path.split('?')[0]
        if clean_path.startswith('/api/orders') or clean_path.startswith('/orders/'):
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            try:
                order = json.loads(body.decode('utf-8'))
                add_or_update_order(order)
                resp = json.dumps({'success': True, 'order': order}, ensure_ascii=False).encode('utf-8')
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Content-Length', str(len(resp)))
                self.send_cors_headers()
                self.end_headers()
                self.wfile.write(resp)
            except Exception as e:
                self.send_error(400, f'Invalid JSON: {e}')
            return
        self.send_error(404, 'Endpoint Not Found')

    def do_DELETE(self):
        clean_path = self.path.split('?')[0]
        if clean_path.startswith('/api/orders/'):
            order_id = clean_path.replace('/api/orders/', '').replace('.json', '')
            orders = get_orders()
            updated = [o for o in orders if o.get('id') != order_id and o.get('orderNo') != order_id]
            save_orders(updated)
            resp = json.dumps({'success': True}, ensure_ascii=False).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(resp)))
            self.send_cors_headers()
            self.end_headers()
            self.wfile.write(resp)
            return
        self.send_error(404, 'Endpoint Not Found')

    def log_message(self, format, *args):
        sys.stderr.write(f"[{self.log_date_time_string()}] " + (format % args) + "\n")

class ReusableTCPServer(socketserver.TCPServer):
    allow_reuse_address = True

if __name__ == '__main__':
    with ReusableTCPServer(('0.0.0.0', PORT), SpaHandler) as httpd:
        print(f"IRAQSTORE_SERVER_STARTED_ON_PORT_{PORT}")
        sys.stdout.flush()
        httpd.serve_forever()
