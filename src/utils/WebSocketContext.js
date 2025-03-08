import { createContext, useEffect, useRef } from "react";
import useWebSocket from "react-use-websocket";
import FingerprintJS from "@fingerprintjs/fingerprintjs";

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
            return reject("Geolocation is not supported by this browser.");
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
                    reject("Failed to fetch location details.");
                }
            },
            (error) => {
                reject(error.message);
            }
        );
    });
}

export const WebSocketProvider = ({ userId, children }) => {
    const didUnmount = useRef(false);

    const device_id = getDeviceId(); // Matches Golang struct field name

    const { sendMessage, lastMessage, readyState, getWebSocket } = useWebSocket(
        `/v1/socket?userId=${userId}&deviceId=${device_id}`, // Append device_id to WebSocket URL
        {
            share: true,
            shouldReconnect: () => didUnmount.current === false && userId !== "guest",
            reconnectAttempts: 50,
            reconnectInterval: 3000,
            retryOnError: true,

            onOpen: async () => {
                console.log("WebSocket Connection Opened");

                try {
                    const systemInfo = await getDeviceFingerprint();
                    const locationInfo = await getUserLocation();

                    const fullDeviceInfo = {
                        ...systemInfo,
                        location: locationInfo, // Matches Golang struct field name
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
                console.log("Received Message:", jsonMessage);

                if (jsonMessage.event === "role_updated") {
                    console.log("Role Updated:", jsonMessage.data.role);
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

        if (lastMessage) {
            console.log("Last message received:", lastMessage.data);
        }

        // Send location updates every 3 minutes
        const sendLocationPeriodically = async () => {
            const sendLocation = async () => {
                try {
                    const locationInfo = await getUserLocation();
                    sendMessage(JSON.stringify({ event: "location_update", data: locationInfo }));
                    console.log("Sent Location Update:", locationInfo);
                } catch (error) {
                    console.error("Error sending location update:", error);
                }
            };

            // Send location immediately
            sendLocation();

            // Set interval to send every 3 minutes (180000 ms)
            const interval = setInterval(sendLocation, 600000);

            // Cleanup interval on unmount
            return () => clearInterval(interval);
        };

        // const cleanup = sendLocationPeriodically();
        sendLocationPeriodically();

        return () => {
            didUnmount.current = true;
            //cleanup();
        };
    }, [userId, lastMessage, sendMessage]);

    return (
        <WebSocketContext.Provider
            value={{ sendMessage, lastMessage, readyState, getWebSocket }}
        >
            {children}
        </WebSocketContext.Provider>
    );
};
