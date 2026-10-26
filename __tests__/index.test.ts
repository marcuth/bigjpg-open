import { describe, expect, it, vi } from "vitest"

import { BigjpgError, BigjpgOpen } from "../src"
import { getImageSize } from "../src/image-size"

const json = (body: unknown) => new Response(JSON.stringify(body))

describe("BigjpgOpen", () => {
    it("creates a task with the conf form field", async () => {
        const fetchMock = vi.fn().mockImplementation(async () => json({ status: "ok", info: "abc", time: 1 }))
        const client = new BigjpgOpen({ fetch: fetchMock })

        const result = await client.createTask({
            input: "https://x.com/a.png",
            fileName: "a.png",
            fileSize: 10,
            width: 4,
            height: 3,
            scale: 4,
        })

        expect(result).toEqual({ tid: "abc", minute: 1 })
        const [url, init] = fetchMock.mock.calls[0]
        expect(url).toBe("https://bigjpg.com/task")
        const conf = JSON.parse((init.body as URLSearchParams).get("conf")!)
        expect(conf).toMatchObject({ x2: "4", style: "art", noise: "0", file_width: 4, file_height: 3, storage: "oss" })
    })

    it("throws BigjpgError on non-ok status", async () => {
        const fetchMock = vi.fn().mockImplementation(async () => json({ status: "param_error" }))
        const client = new BigjpgOpen({ fetch: fetchMock })

        await expect(client.getTask("x")).rejects.toBeInstanceOf(BigjpgError)
    })

    it("waits for a task to succeed", async () => {
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(json({ abc: ["process", "", ""] }))
            .mockResolvedValueOnce(json({ abc: ["success", "https://cdn/out.png", "123"] }))
        const client = new BigjpgOpen({ fetch: fetchMock })

        const task = await client.waitForTask("abc", { interval: 1 })

        expect(task).toEqual({ id: "abc", status: "success", url: "https://cdn/out.png", size: 123 })
    })
})

describe("getImageSize", () => {
    it("reads PNG dimensions", () => {
        const png = new Uint8Array(24)
        png.set([0x89, 0x50, 0x4e, 0x47])
        new DataView(png.buffer).setUint32(16, 1920)
        new DataView(png.buffer).setUint32(20, 1080)
        expect(getImageSize(png)).toEqual({ width: 1920, height: 1080 })
    })
})
