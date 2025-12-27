---
description: How to bridge WSL2 automation tools to a Chrome instance running on Windows host
---

This workflow establishes a stable bidirectional connection between an agent/script running in WSL2 and a Chrome browser running on Windows. This is necessary because Chrome restricts remote debugging by default, and WSL2 network isolation complicates access to Windows localhost.

# 1. Windows Side Configuration

### Step 1.1: Enable PortProxy
Chrome forces `127.0.0.1` binding by default. We use Windows PortProxy to expose it to WSL on a different port (9223) to avoid conflicts and bypass binding restrictions.

Run as **Administrator** (PowerShell/CMD):
```powershell
# 1. Forward External Port 9223 -> Internal Port 9222
netsh interface portproxy add v4tov4 listenport=9223 listenaddress=0.0.0.0 connectport=9222 connectaddress=127.0.0.1

# 2. Allow Port 9223 through Windows Firewall
netsh advfirewall firewall add rule name="Allow Chrome Proxy" dir=in action=allow protocol=TCP localport=9223
```

### Step 1.2: Launch Chrome
Launch Chrome with specific flags to allow remote control and prevent it from background-sleeping.
**Crucial**: Use `&` and quotes `'*'` in PowerShell to prevent argument corruption.

Run in PowerShell:
```powershell
# Adjust path if Chrome is installed elsewhere
$chromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$userData = "C:\temp\chrome_dev_bridge"  # Use a separate profile for safety

& $chromePath --remote-debugging-port=9222 --remote-allow-origins='*' --user-data-dir=$userData
```
*Note: Chrome will listen on 127.0.0.1:9222, which PortProxy will forward to.*

---

# 2. WSL Side Configuration

### Step 2.1: Install Dependencies
We use `socat` to create a local pipe, as some automation tools hardcode `localhost`.
```bash
sudo apt-get update && sudo apt-get install -y socat net-tools
```

### Step 2.2: Establish Local Bridge
Forward WSL's `localhost:9222` to the Windows Gateway IP on port `9223`.

```bash
# 1. Find the Windows Gateway IP (The default route)
export WINDOWS_GATEWAY=$(ip route | grep default | awk '{print $3}')
echo "Windows Gateway: $WINDOWS_GATEWAY"

# 2. Start Socat Forwarder (Background)
# This listens on WSL:9222 and forwards to Windows:9223
socat TCP-LISTEN:9222,fork,bind=127.0.0.1 TCP:$WINDOWS_GATEWAY:9223 &
```

---

# 3. Verification

Run this curl command from WSL to test the full chain:
```bash
curl -v http://127.0.0.1:9222/json/version
```

**Expected Output**:
A JSON response containing `"Browser": "Chrome/..."` and `"webSocketDebuggerUrl"`.

# 4. Cleanup (Optional)
To remove the Windows proxy rules later:
```powershell
netsh interface portproxy delete v4tov4 listenport=9223
netsh advfirewall firewall delete rule name="Allow Chrome Proxy"
```
