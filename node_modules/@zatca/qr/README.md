<h1 align="center">Welcome to @zatca/qr 👋</h1>
<p>
  <a href="https://www.npmjs.com/package/@zatca/qr" target="_blank">
    <img alt="Version" src="https://img.shields.io/npm/v/@zatca/qr.svg">
  </a>
  <a href="#" target="_blank">
    <img alt="License: GPL" src="https://img.shields.io/badge/License-GPL-yellow.svg" />
  </a>
  <a href="https://twitter.com/shahidcodes" target="_blank">
    <img alt="Twitter: shahidcodes" src="https://img.shields.io/twitter/follow/shahidcodes.svg?style=social" />
  </a>
</p>

> Generate KSA E-Invoice Compatible QR Codes

### 🏠 [Homepage](https://github.com/shahidcodes)

## Install

```sh
npm install @zatca/qr
```

## Usage

```ts
import { generateQR } from "@zatca/qr";

const testData: EInvoiceFields = {
  sellerName: "Shahid",
  vatNumber: "12345678910111",
  timestamp: "2022-01-02 10:30",
  total: "100.00",
  vatTotal: "15.00",
};

const qrBuffer = await generateQR(testData, { format: "buffer" });
```

## Run tests

```sh
npm run test
```

## Author

👤 **Shahid Kamal <shahidkamal08@gmail.com>**

- Website: https://shahid.codes
- Twitter: [@shahidcodes](https://twitter.com/shahidcodes)
- Github: [@shahidcodes](https://github.com/shahidcodes)
- LinkedIn: [@shahidkamal](https://linkedin.com/in/shahidkamal)

## 🤝 Contributing

Contributions, issues and feature requests are welcome!<br />Feel free to check [issues page](https://github.com/shahidcodes/zatca-e-invoice-qr-generator/issues).
