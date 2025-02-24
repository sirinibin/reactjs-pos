const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
    app.use(
        ['/v1', '/zatca/xml', '/zatca/returns/xml', '/images'], // You can pass in an array too eg. ['/api', '/another/path']
        createProxyMiddleware({
            target: process.env.REACT_APP_PROXY_HOST,
            changeOrigin: true,
        })
    );
};
