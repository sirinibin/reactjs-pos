const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
    app.use(
        ['/v1', '/zatca/xml', '/pdfs', '/zatca/returns/xml', '/images', '/socket.io/', '/sockjs-node'], // You can pass in an array too eg. [' / api', ' / another / path']
        createProxyMiddleware({
            target: process.env.REACT_APP_PROXY_HOST,
            changeOrigin: true,
            ws: true,
            logLevel: "debug", // For Debugging Proxy
        })
    );
};
