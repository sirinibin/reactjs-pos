// Smoke test for store/StoreDuplicateProducts.js
import { runDuplicateModalTests } from "../testHelpers/storeDuplicateModalTestFactory";
import StoreDuplicateProducts from "../StoreDuplicateProducts.js";

describe("StoreDuplicateProducts smoke test", () => {
    runDuplicateModalTests(StoreDuplicateProducts, {
        titleText: "Duplicate Store with Products",
        buttonText: "Duplicate with Products",
        endpointSlug: "duplicate-with-products",
    });
});
