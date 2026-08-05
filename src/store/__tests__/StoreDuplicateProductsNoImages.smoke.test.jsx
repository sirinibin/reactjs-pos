// Smoke test for store/StoreDuplicateProductsNoImages.js
import { runDuplicateModalTests } from "../testHelpers/storeDuplicateModalTestFactory";
import StoreDuplicateProductsNoImages from "../StoreDuplicateProductsNoImages.js";

describe("StoreDuplicateProductsNoImages smoke test", () => {
    runDuplicateModalTests(StoreDuplicateProductsNoImages, {
        titleText: "Duplicate Store with Products \\(no images\\)",
        buttonText: "Duplicate with Products \\(no images\\)",
        endpointSlug: "duplicate-with-products-no-images",
    });
});
