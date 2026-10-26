# bigjpg-open

TypeScript client for the [Bigjpg](https://bigjpg.com) API (the same one the website uses) to enlarge images with AI. No API key required.

## Installation

```bash
npm install bigjpg-open
```

Requires Node.js 18+ (uses the native `fetch`).

## Usage

```ts
import { readFile } from "node:fs/promises"

import { BigjpgOpen } from "bigjpg-open"

const client = new BigjpgOpen()

// From a URL (downloaded and uploaded to Bigjpg)
const task = await client.enlarge({ input: "https://github.com/marcuth.png", scale: 2, style: "photo", noise: 1 })
console.log(task.url)

// From a local file
await client.enlarge({
    input: { data: await readFile("image.png"), filename: "image.png", filetype: "image/png" },
})
```

### Manual control

```ts
const { fileUrl } = await client.upload({ data, filename: "a.png", filetype: "image/png" })
const { tid } = await client.createTask({ input: fileUrl, fileName: "a.png", fileSize, width, height })
const task = await client.waitForTask(tid) // or client.getTask(tid)
```

## Options

| Option  | Values                        | Default |
| ------- | ----------------------------- | ------- |
| `style` | `"art"`, `"photo"`            | `"art"` |
| `noise` | `-1` (none) to `3` (highest)  | `0`     |
| `scale` | `2`, `4`, `8`, `16`           | `2`     |

Width and height are read from the PNG, JPEG, GIF and WebP headers; for other formats, pass `width` and `height`.

## Errors

Failures throw a `BigjpgError` whose `code` is either the `status` returned by the site, or one of `upload_failed`, `download_failed`, `unknown_image_size`, `task_failed` and `timeout`.

## License

MIT
