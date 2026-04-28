import { createContext, useEffect, useRef } from "react";
import useWebSocket from "react-use-websocket";
import FingerprintJS from "@fingerprintjs/fingerprintjs";
import eventEmitter from "./eventEmitter"; // Import event emitter

export const WebSocketContext = createContext();

// Function to generate or retrieve a persistent device ID
function getDeviceId() {
    let device_id = localStorage.getItem("device_id");
    if (!device_id) {
        device_id = crypto.randomUUID(); // Generate a random unique ID
        localStorage.setItem("device_id", device_id);
    }
    return device_id;
}

// Function to detect device type (Mobile, Tablet, Computer)
function getDeviceType() {
    const userAgent = navigator.userAgent.toLowerCase();

    if (/mobile|iphone|ipod|android|blackberry|opera mini|windows phone/i.test(userAgent)) {
        return "Mobile";
    } else if (/tablet|ipad/i.test(userAgent)) {
        return "Tablet";
    } else {
        return "Computer";
    }
}


const getIp = async () => {
    try {
        const response = await fetch("https://api.ipify.org?format=json");
        const data = await response.json();
        return data.ip;
    } catch (error) {
        console.error("Error fetching IP:", error);
        return "";
    }
};

// Function to get device fingerprint and system info
async function getDeviceFingerprint() {
    const fp = await FingerprintJS.load();
    const result = await fp.get();

    let deviceDetails = {
        device_id: getDeviceId(), // Matches Golang struct field name
        fingerprint: result.visitorId, // Matches Golang struct field name
        user_agent: navigator.userAgent, // Matches Golang struct field name
        platform: navigator.platform, // Matches Golang struct field name
        screen_width: window.screen.width, // Matches Golang struct field name
        screen_height: window.screen.height, // Matches Golang struct field name
        cpu_cores: navigator.hardwareConcurrency, // Matches Golang struct field name
        ram: navigator.deviceMemory || "Unknown", // Matches Golang struct field name
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, // Matches Golang struct field name
        touch: "ontouchstart" in window, // Matches Golang struct field name
        battery: (navigator.getBattery ? await navigator.getBattery() : {}).level || "N/A", // Matches Golang struct field name
        device_type: getDeviceType(), // Matches Golang struct field name
        ip_address: await getIp(),
    };


    deviceDetails.screen_width = deviceDetails.screen_width.toString()
    deviceDetails.screen_height = deviceDetails.screen_height.toString()
    deviceDetails.cpu_cores = deviceDetails.cpu_cores.toString()
    deviceDetails.ram = deviceDetails.ram.toString()
    deviceDetails.battery = deviceDetails.battery.toString()

    return deviceDetails;
}

// Function to get user location (latitude, longitude, city, country)
async function getUserLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            return reject({ code: 0, message: "Geolocation is not supported by this browser." });
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;

                try {
                    // Fetch location details using OpenStreetMap's Nominatim API
                    const response = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
                    );
                    const data = await response.json();

                    resolve({
                        latitude: latitude.toString(), // Matches Golang struct field name
                        longitude: longitude.toString(), // Matches Golang struct field name
                        city: data.address.city || data.address.town || data.address.village || "Unknown", // Matches Golang struct field name
                        country: data.address.country || "Unknown", // Matches Golang struct field name
                    });
                } catch (error) {
                    reject({ code: 0, message: "Failed to fetch location details." });
                }
            },
            (error) => {
                reject(error); // pass the full PositionError (has .code and .message)
            }
        );
    });
}

export const WebSocketProvider = ({ userId, children }) => {
    const didUnmount = useRef(false);

    const device_id = getDeviceId(); // Matches Golang struct field name

    const { sendMessage, lastMessage, readyState, getWebSocket } = useWebSocket(
        userId !== "guest" ? `/v1/socket?userId=${userId}&deviceId=${device_id}` : null, // null = no connection when not logged in
        {
            share: true,
            shouldReconnect: () => didUnmount.current === false && userId !== "guest",
            reconnectAttempts: 50,
            reconnectInterval: 3000,
            retryOnError: true,
            heartbeat: true,

            onOpen: async () => {
                console.log("WebSocket Connection Opened");
                eventEmitter.emit("socket_connection_open"); // Emit event to other components

                try {
                    const systemInfo = await getDeviceFingerprint();
                    //const locationInfo = await getUserLocation();

                    const fullDeviceInfo = {
                        ...systemInfo,
                        //   location: locationInfo, // Matches Golang struct field name
                    };

                    console.log("Sending System & Location Info:", fullDeviceInfo);
                    sendMessage(
                        JSON.stringify({ event: "connection_open", data: fullDeviceInfo })
                    );
                } catch (error) {
                    console.error("Error fetching location:", error);
                }


            },
            onClose: () => {
                console.log("WebSocket Connection Closed");
            },
            onMessage: (messageEvent) => {
                const jsonMessage = JSON.parse(messageEvent.data);
                //console.log("Received Message:", jsonMessage);

                if (jsonMessage.event === "role_updated") {
                    //console.log("Role Updated:", jsonMessage.data.role);
                } else if (jsonMessage.event === "pong") {
                    //console.log("Pong received:", jsonMessage.data);
                }
            },
            onError: (errorEvent) => {
                console.log("WebSocket Error:", errorEvent);
            },
            onReconnectStop: (numAttempted) => {
                console.log("Reconnection Stopped after", numAttempted, "attempts");
            },
        }
    );


    useEffect(() => {
        if (!userId) return;
        console.log("WebSocket initialized for userId:", userId);

        // Detect Tauri (may run inside an iframe, so check window.parent too)
        const isTauri = typeof window.__TAURI__ !== 'undefined' ||
            typeof window.__TAURI_INTERNALS__ !== 'undefined' ||
            (() => { try { return window.parent !== window && typeof window.parent.__TAURI__ !== 'undefined'; } catch (_) { return false; } })();

        const sendLocation = async () => {
            try {
                // In Tauri (macOS desktop app), skip the navigator.permissions pre-check.
                // WKWebView caches geolocation as 'denied' at its own layer (set before
                // macOS system permission was granted), but Tauri routes getCurrentPosition
                // through CoreLocation directly — so the permissions API state is stale and
                // causes a false "Location Access Required" modal on every new tab.
                // We rely solely on getCurrentPosition() to determine the real state.
                if (!isTauri && navigator.permissions) {
                    const perm = await navigator.permissions.query({ name: 'geolocation' });
                    if (perm.state === 'denied') {
                        eventEmitter.emit('geolocation_denied');
                        return;
                    }
                }

                const locationInfo = await getUserLocation();
                // Successfully got location — emit granted so modal can close
                eventEmitter.emit('geolocation_granted');
                sendMessage(JSON.stringify({ event: "location_update", data: locationInfo }));
            } catch (err) {
                // PERMISSION_DENIED (code 1) — user actually blocked location access.
                // In Tauri, geolocation inside a WKWebView iframe may fail with code 1
                // regardless of system permission (iframe vs main-frame restriction).
                // Suppress the modal in Tauri to avoid it appearing on every tab load.
                if (err && err.code === 1 && !isTauri) {
                    eventEmitter.emit('geolocation_denied');
                }
                // All other errors (network, timeout, etc.) silently ignored
            }
        };

        // Send ping immediately
        sendLocation();

        // Set interval for every 30min
        const interval = setInterval(sendLocation, 60000 * 30);

        // Cleanup interval on unmount
        return () => {
            clearInterval(interval);
        };
    }, [userId, sendMessage]); // Removed lastMessage to avoid unnecessary re-runs


    useEffect(() => {
        if (!userId) return;

        const sendPing = () => {
            try {
                sendMessage(JSON.stringify({ event: "ping", data: { "message": "ping" } }));
            } catch (_) {
                // Ignore ping errors silently
            }
        };

        // Send ping immediately
        sendPing();

        // Set interval for every 5min
        const interval = setInterval(sendPing, 60000 * 5);

        // Cleanup interval on unmount
        return () => {
            clearInterval(interval);
        };
    }, [userId, sendMessage]); // Removed lastMessage to avoid unnecessary re-runs

    return (
        <WebSocketContext.Provider
            value={{ sendMessage, lastMessage, readyState, getWebSocket }}
        >
            {children}
        </WebSocketContext.Provider>
    );
};
