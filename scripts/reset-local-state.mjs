const keys = ["kinloop-product-state"];

for (const key of keys) {
  console.log(`Browser reset required: clear localStorage key ${key} in http://localhost:3000`);
}

console.log("Server-side product state is deterministic and requires no reset.");
console.log("For a clean recording, open browser devtools and run:");
console.log("localStorage.removeItem('kinloop-product-state'); location.reload();");
