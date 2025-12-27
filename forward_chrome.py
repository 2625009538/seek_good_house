import socket
import threading
import time
import os

def get_host_ip():
    try:
        with open('/etc/resolv.conf', 'r') as f:
            for line in f:
                if 'nameserver' in line:
                    return line.split()[1]
    except:
        pass
    return '127.0.0.1'

REMOTE_HOST = get_host_ip()
REMOTE_PORT = 9222
LOCAL_PORT = 9222

def forward(source, destination):
    try:
        while True:
            data = source.recv(4096)
            if not data: break
            destination.sendall(data)
    except:
        pass
    finally:
        source.close()
        destination.close()

def handle_client(client_socket):
    try:
        # Connect to Windows Host
        remote_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        remote_socket.connect((REMOTE_HOST, REMOTE_PORT))
        
        # Start forwarding in both directions
        threading.Thread(target=forward, args=(client_socket, remote_socket), daemon=True).start()
        threading.Thread(target=forward, args=(remote_socket, client_socket), daemon=True).start()
    except Exception as e:
        print(f"Failed to bridge to {REMOTE_HOST}: {e}")
        client_socket.close()

def main():
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    
    # Bind to localhost to intercept the request meant for the browser tool
    try:
        server.bind(('127.0.0.1', LOCAL_PORT))
    except OSError:
        print("Address already in use. Killing conflicting process or retry...")
        return

    server.listen(5)
    print(f"Proxy listening on 127.0.0.1:{LOCAL_PORT} -> {REMOTE_HOST}:{REMOTE_PORT}")
    
    while True:
        client, addr = server.accept()
        threading.Thread(target=handle_client, args=(client,), daemon=True).start()

if __name__ == '__main__':
    main()
