import socket
import threading

# The Verified Gateway IP and the PortProxy Port
REMOTE_HOST = '172.30.240.1' 
REMOTE_PORT = 9223
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
        remote_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        remote_socket.connect((REMOTE_HOST, REMOTE_PORT))
        
        threading.Thread(target=forward, args=(client_socket, remote_socket), daemon=True).start()
        threading.Thread(target=forward, args=(remote_socket, client_socket), daemon=True).start()
    except Exception as e:
        print(f"Failed to bridge: {e}")
        client_socket.close()

def main():
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    
    try:
        server.bind(('127.0.0.1', LOCAL_PORT))
    except OSError:
        # If port is taken (e.g. by previous python script), we can't do much without killing it.
        # But previously we killed socat. The previous python script used 'allow_reuse_addr' so it might be ok overlapping or we need to kill python.
        print("Port in use, assuming previous forwarder is ok or manual kill needed.")
        return

    server.listen(5)
    print(f"Forwarding 127.0.0.1:{LOCAL_PORT} -> {REMOTE_HOST}:{REMOTE_PORT}")
    
    while True:
        client, addr = server.accept()
        threading.Thread(target=handle_client, args=(client,), daemon=True).start()

if __name__ == '__main__':
    main()
