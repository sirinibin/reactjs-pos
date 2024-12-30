"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Invoice = void 0;
var tag_1 = require("./tag");
var to_tlv_1 = require("../utils/to-tlv");
var to_base64_1 = require("../utils/to-base64");
var qrcode_1 = require("qrcode");
/**
 * Invoice class
 */
var Invoice = /** @class */ (function () {
    function Invoice(invoice) {
        this._tlv = (0, to_tlv_1.toTlv)([
            new tag_1.Tag(1, invoice.sellerName),
            new tag_1.Tag(2, invoice.vatRegistrationNumber),
            new tag_1.Tag(3, invoice.invoiceTimestamp),
            new tag_1.Tag(4, invoice.invoiceTotal),
            new tag_1.Tag(5, invoice.invoiceVatTotal),
        ]);
    }
    /**
     * Returns the TLV representation of the invoice
     * @return {string}
     */
    Invoice.prototype.toTlv = function () {
        return this._tlv;
    };
    /**
     * Returns a base64 string representing the invoice
     * @return {string}
     */
    Invoice.prototype.toBase64 = function () {
        return (0, to_base64_1.toBase64)(this._tlv);
    };
    /**
     * Returns a QR code as base64 data image
     * @return {string}
     */
    Invoice.prototype.render = function (options) {
        return (0, qrcode_1.toDataURL)(this.toBase64(), options);
    };
    return Invoice;
}());
exports.Invoice = Invoice;
