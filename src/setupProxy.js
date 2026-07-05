const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
    // Dedicated WebSocket proxy — only intercepts upgrades for /v1/socket
    app.use(
        '/v1/socket',
        createProxyMiddleware({
            target: process.env.REACT_APP_PROXY_HOST,
            changeOrigin: true,
            ws: true,
            logLevel: "debug",
        })
    );

    // HTTP proxy for all other API paths
    app.use(
        ['/v1', '/zatca', '/pdfs', '/images', '/socket.io/'],
        createProxyMiddleware({
            target: process.env.REACT_APP_PROXY_HOST,
            changeOrigin: true,
            logLevel: "debug",
            onProxyReq: (proxyReq, req) => {
                proxyReq.setHeader('X-Forwarded-Host', req.headers.host || '');
                proxyReq.setHeader('X-Forwarded-Proto', req.protocol || 'http');
            },
        })
    );
};
