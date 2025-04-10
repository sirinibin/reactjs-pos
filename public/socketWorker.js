self.onmessage = function (event) {
    const { serverUrl } = event.data;

    let socket = new WebSocket(serverUrl);

    socket.onopen = () => {
        console.log("[Worker] WebSocket connected");
        self.postMessage({ type: "connected" });

        // Send a ping every 30 seconds to keep the connection alive
        setInterval(() => {
            if (socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({ event: "ping" }));
            }
        }, 30000);
    };

    socket.onmessage = (msg) => {
        self.postMessage({ type: "message", data: msg.data });
    };

    socket.onclose = () => {
        console.log("[Worker] WebSocket closed, reconnecting...");
        self.postMessage({ type: "disconnected" });

        // Reconnect after 5 seconds
        setTimeout(() => {
            self.onmessage({ data: { serverUrl } });
        }, 5000);
    };
};
