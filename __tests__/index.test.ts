import { describe, expect, it, vi } from "vitest"

import { BigjpgError, BigjpgOpen } from "../src"

const json = (body: unknown) => new Response(JSON.stringify(body))

describe("BigjpgOpen", () => {
    it("creates a task mapping scale to x2", async () => {
        const fetchMock = vi.fn().mockResolvedValue(json({ tid: "abc", minute: 1, remaining_api_calls: 9 }))
        const client = new BigjpgOpen({ apiKey: "key", fetch: fetchMock })

        const result = await client.createTask({ input: "https://x.com/a.jpg", scale: 8 })

        expect(result).toEqual({ tid: "abc", minute: 1, remainingApiCalls: 9 })
        const [url, init] = fetchMock.mock.calls[0]
        expect(url).toBe("https://bigjpg.com/api/task/")
        expect(init.headers["X-API-KEY"]).toBe("key")
        expect(JSON.parse(init.body).x2).toBe(3)
    })

    it("throws BigjpgError on status errors", async () => {
        const fetchMock = vi.fn().mockImplementation(async () => json({ status: "param_error" }))
        const client = new BigjpgOpen({ apiKey: "key", fetch: fetchMock })

        await expect(client.createTask({ input: "x" })).rejects.toMatchObject({ code: "param_error" })
        await expect(client.createTask({ input: "x" })).rejects.toBeInstanceOf(BigjpgError)
    })

    it("waits for a task to succeed, accepting array and object payloads", async () => {
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(json({ abc: ["process", "", ""] }))
            .mockResolvedValueOnce(json({ abc: { status: "success", url: "https://r2/out.jpg", size: "123" } }))
        const client = new BigjpgOpen({ apiKey: "key", fetch: fetchMock })

        const task = await client.waitForTask("abc", { interval: 1 })

        expect(task).toEqual({ id: "abc", status: "success", url: "https://r2/out.jpg", size: 123 })
    })
})
