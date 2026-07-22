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
                } else if (jsonMessage.event === "delivery_note_reminder") {
                    eventEmitter.emit("delivery_note_reminder", jsonMessage.data);
                } else if (jsonMessage.event === "delivery_note_order_linked") {
                    eventEmitter.emit("delivery_note_order_linked", jsonMessage.data);
                } else if (jsonMessage.event === "purchase_request_received") {
                    eventEmitter.emit("purchase_request_received", jsonMessage.data);
                } else if (jsonMessage.event === "purchase_request_status_changed") {
                    eventEmitter.emit("purchase_request_status_changed", jsonMessage.data);
                } else if (jsonMessage.event === "purchase_request_po_created") {
                    eventEmitter.emit("purchase_request_po_created", jsonMessage.data);
                } else if (jsonMessage.event === "purchase_request_updated") {
                    eventEmitter.emit("purchase_request_updated", jsonMessage.data);
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

        // Location tracking disabled — no interval needed
        return () => {};
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
