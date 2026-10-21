# Lattice TypeScript SDK demo

A small command-line app that uses Anduril's official TypeScript Lattice SDK to:

- Publish an entity and fetch entity events.
- Create a task and fetch it by ID.
- Create an SRT egress stream from a live ingress stream.
- Upload an object and download it to a local file.

> The official TypeScript SDK uses HTTP APIs, not gRPC. Entity events are produced by
> entity publication and retrieved through the SDK's long-poll API; there is no
> standalone `publishEvent` call in this SDK. See the
> [official SDK documentation](https://github.com/anduril/lattice-sdk-javascript)
> for package and API reference details.

## Requirements

- Node.js 18 or later.
- Access to a Lattice environment and its API base URL.
- Either a bearer token or OAuth client credentials authorized for the APIs used.

## Setup

```sh
npm install
cp .env.example .env
```

Set `LATTICE_ENDPOINT` and `ENVIRONMENT_TOKEN` in `.env`. If the environment is
a sandbox, also set `SANDBOXES_TOKEN`; the client sends it as the
`anduril-sandbox-authorization: Bearer ...` header alongside the regular
`authorization: Bearer ...` header. Alternatively, use
`LATTICE_CLIENT_ID` and `LATTICE_CLIENT_SECRET` for OAuth instead of
`ENVIRONMENT_TOKEN`. Get the environment URL and credentials from your Lattice
administrator or Anduril representative. Do not commit `.env`.

## Commands

Run commands using `npm run dev -- ...`:

```sh
# Publish an entity. Lattice emits entity events as a result.
npm run dev -- event publish examples/event.entity.json

# Start an event polling session (may wait while Lattice long-polls).
npm run dev -- event fetch

# Fetch the next batch in an existing polling session.
npm run dev -- event fetch <session-token>

# Create a task, then use the returned taskId to fetch it.
npm run dev -- task create examples/task.json
npm run dev -- task get <task-id>

# Create an SRT egress stream from a live ingress stream.
npm run dev -- video egress create examples/video-egress.json

# Upload and fetch an object.
npm run dev -- object upload examples/object.txt demo/examples/object.txt
npm run dev -- object get demo/examples/object.txt ./downloaded-object.txt
```

`event fetch` prints the `sessionToken` returned by Lattice. Pass that token to
the next invocation to continue the same long-poll session. An empty token
starts a new session and returns pre-existing data before subsequent changes.
The server may hold each long-poll request open for up to five minutes.

The event publish command accepts a JSON `Lattice.Entity`; `entityId` and a
nonempty `aliases.name` are required. If omitted, the command sets
`provenance.sourceUpdateTime` to the current time and `expiryTime` to 24 hours
later. For updates with a provided source update time, advance it on each
publication so Lattice can accept the newer version. The included entity JSON
is a minimal example; adapt its fields to your environment's entity schema.

Task creation accepts a JSON `Lattice.TaskCreation`. Include an `author`
principal when calling through this HTTP SDK; the service cannot infer the
initiating system from gRPC caller metadata. The example sets a system author
named `lattice-typescript-sdk-demo`; replace it with the service identity
appropriate for your integration. Object upload accepts any local file and an
object path; object get writes the binary response to the specified local file.

Video egress creation accepts a JSON `Lattice.CreateEgressStreamRequest`. Set
`ingressId` to an existing live ingress stream; the example requests SRT egress.
The response includes the egress connection URL and session ID for the consumer.

## Build

```sh
npm run typecheck
npm run build
npm start -- task get <task-id>
```
