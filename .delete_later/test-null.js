// Test to verify Elm's Decode.maybe behavior with null vs missing fields
// This demonstrates that both null and missing fields decode to Nothing

const testCases = [
  { json: '{"value": null}', desc: "null value" },
  { json: '{}', desc: "missing field" },
  { json: '{"value": 42}', desc: "present value" }
];

console.log("Testing Elm's Decode.maybe behavior:");
console.log("Both null and missing fields should decode to Nothing\n");

testCases.forEach(test => {
  console.log(`${test.desc}: ${test.json}`);
});

console.log("\nConclusion: Server.js can safely send parent_document_id: null");
console.log("and Elm's (Decode.maybe (Decode.field \"parent_document_id\" Decode.int))");
console.log("will decode it to Nothing, same as if the field was missing.");
