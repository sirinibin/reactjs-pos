"use strict";
/**
 * This is a play area for internal stuff.
 * You can write code the way you like,
 * but it will not be part of the final build.
 */
Object.defineProperty(exports, "__esModule", { value: true });
var tag_1 = require("../models/tag");
var invoice_1 = require("../models/invoice");
var to_base64_1 = require("../utils/to-base64");
var to_hex_1 = require("../utils/to-hex");
var tags = [
    new tag_1.Tag(1, 'Axenda'),
    new tag_1.Tag(2, '1234567891'),
    new tag_1.Tag(3, '2021-12-04T00:00:00Z'),
    new tag_1.Tag(4, '100.00'),
    new tag_1.Tag(5, '15.00'),
];
//toBase64(tlv);
(0, to_base64_1.tagsToBase64)(tags);
//renderTags(tags);
var invoice = new invoice_1.Invoice({
    sellerName: 'Axenda',
    vatRegistrationNumber: '1234567891',
    invoiceTimestamp: '2021-12-04T00:00:00Z',
    invoiceTotal: '100.00',
    invoiceVatTotal: '15.00',
});
invoice.toBase64();
//invoice.render().then((qrcode) => {
//	console.log(qrcode);
//});
console.log('-------------------------');
(0, to_hex_1.toHex)(1);
