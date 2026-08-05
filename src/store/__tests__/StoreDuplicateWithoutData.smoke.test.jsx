// Smoke test for store/StoreDuplicateWithoutData.js
import { runDuplicateModalTests } from "../testHelpers/storeDuplicateModalTestFactory";
import StoreDuplicateWithoutData from "../StoreDuplicateWithoutData.js";

describe("StoreDuplicateWithoutData smoke test", () => {
    runDuplicateModalTests(StoreDuplicateWithoutData, {
        titleText: "Duplicate Store without Data",
        buttonText: "Duplicate without Data",
        endpointSlug: "duplicate-without-data",
    });
});
