// Smoke test for store/StoreDuplicate.js
import { runDuplicateModalTests } from "../testHelpers/storeDuplicateModalTestFactory";
import StoreDuplicate from "../StoreDuplicate.js";

describe("StoreDuplicate smoke test", () => {
    runDuplicateModalTests(StoreDuplicate, {
        titleText: "Duplicate Store",
        buttonText: "Duplicate Store",
        endpointSlug: "duplicate",
    });
});
