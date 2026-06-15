import https from "https";
import http from "http";

const req = http.request(
  "http://localhost:3000/api/ai/translate",
  { method: "POST", headers: { "Content-Type": "application/json" } },
  (res) => {
    let data = "";
    res.on("data", (chunk) => (data += chunk));
    res.on("end", () => console.log("Status:", res.statusCode, "\nBody:", data));
  }
);
req.write(JSON.stringify({ text: "Hello", direction: "modernToClassical" }));
req.end();
