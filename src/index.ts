import { createReadStream } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { Lattice } from "@anduril-industries/lattice-sdk";
import { createLatticeClient } from "./client.js";

function usage(): never {
    throw new Error(
        [
            "Usage:",
            "  npm run dev -- event publish <entity.json>",
            "  npm run dev -- event fetch [session-token]",
            "  npm run dev -- task create <task.json>",
            "  npm run dev -- task get <task-id>",
            "  npm run dev -- video egress create <request.json>",
            "  npm run dev -- object upload <local-file> <object-path>",
            "  npm run dev -- object get <object-path> <output-file>",
        ].join("\n"),
    );
}

async function readJsonFile<T>(filePath: string): Promise<T> {
    const content = await readFile(resolve(filePath), "utf8");
    return JSON.parse(content) as T;
}

function printJson(value: unknown): void {
    console.log(JSON.stringify(value, null, 2));
}

async function run(args: string[]): Promise<void> {
    const [resource, action, ...params] = args;
    const client = createLatticeClient();

    if (resource === "event" && action === "publish" && params.length === 1) {
        const entity = await readJsonFile<Lattice.Entity>(params[0]);
        if (!entity.entityId) {
            throw new Error("The entity JSON must include entityId.");
        }
        if (!entity.aliases?.name?.trim()) {
            throw new Error("The entity JSON must include a nonempty aliases.name.");
        }

        const now = new Date();
        entity.provenance = {
            ...entity.provenance,
            sourceUpdateTime:
                entity.provenance?.sourceUpdateTime ?? now.toISOString(),
        };
        entity.expiryTime ??= new Date(
            now.getTime() + 24 * 60 * 60 * 1000,
        ).toISOString();

        const published = await client.entities.publishEntity(entity);
        printJson(published);
        return;
    }

    if (resource === "event" && action === "fetch" && params.length <= 1) {
        const response = await client.entities.longPollEntityEvents({
            sessionToken: params[0] ?? "",
        });
        printJson(response);
        return;
    }

    if (resource === "task" && action === "create" && params.length === 1) {
        const taskRequest = await readJsonFile<Lattice.TaskCreation>(params[0]);
        const task = await client.tasks.createTask(taskRequest);
        printJson(task);
        return;
    }

    if (resource === "task" && action === "get" && params.length === 1) {
        const task = await client.tasks.getTask({ taskId: params[0] });
        printJson(task);
        return;
    }

    if (
        resource === "video" &&
        action === "egress" &&
        params[0] === "create" &&
        params.length === 2
    ) {
        const request = await readJsonFile<Lattice.CreateEgressStreamRequest>(
            params[1],
        );
        const stream = await client.video.createEgressStream(request);
        printJson(stream);
        return;
    }

    if (resource === "object" && action === "upload" && params.length === 2) {
        const [localFile, objectPath] = params;
        const result = await client.objects.uploadObject(
            createReadStream(resolve(localFile)),
            objectPath,
        );
        printJson(result);
        return;
    }

    if (resource === "object" && action === "get" && params.length === 2) {
        const [objectPath, outputFile] = params;
        const object = await client.objects.getObject({ objectPath });
        const contents = Buffer.from(await object.arrayBuffer());
        await writeFile(resolve(outputFile), contents);
        console.log(`Downloaded ${contents.byteLength} bytes to ${resolve(outputFile)}`);
        return;
    }

    usage();
}

run(process.argv.slice(2)).catch((error: unknown) => {
    if (error instanceof Error) {
        console.error(error.message);
    } else {
        console.error("The command failed with a non-Error value.", error);
    }
    process.exitCode = 1;
});
