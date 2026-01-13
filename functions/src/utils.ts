import * as crypto from "crypto";

export function hashInputs(inputs: Record<string, any>): string {
    // Canonicalize keys
    const keys = Object.keys(inputs).sort();
    const canonical = keys.map(k => `${k}:${JSON.stringify(inputs[k])}`).join("|");
    return crypto.createHash("sha256").update(canonical).digest("hex");
}
