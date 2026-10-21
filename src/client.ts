import "dotenv/config";
import { LatticeClient } from "@anduril-industries/lattice-sdk";

function required(name: string, value: string | undefined): string {
    if (!value?.trim()) {
        throw new Error(`Missing required environment variable: ${name}`);
    }

    return value.trim();
}

export function createLatticeClient(): LatticeClient {
    const baseUrl = required("LATTICE_ENDPOINT", process.env.LATTICE_ENDPOINT);
    const token = process.env.ENVIRONMENT_TOKEN?.trim();
    const sandboxToken = process.env.SANDBOXES_TOKEN?.trim();
    const clientId = process.env.LATTICE_CLIENT_ID?.trim();
    const clientSecret = process.env.LATTICE_CLIENT_SECRET?.trim();
    const headers = sandboxToken
        ? { "anduril-sandbox-authorization": `Bearer ${sandboxToken}` }
        : undefined;

    if (token && (clientId || clientSecret)) {
        throw new Error("Set ENVIRONMENT_TOKEN or OAuth client credentials, not both.");
    }

    if (token) {
        return new LatticeClient({ baseUrl, token, headers });
    }

    if (!clientId || !clientSecret) {
        throw new Error(
            "Set ENVIRONMENT_TOKEN or both LATTICE_CLIENT_ID and LATTICE_CLIENT_SECRET.",
        );
    }

    return new LatticeClient({ baseUrl, clientId, clientSecret, headers });
}
