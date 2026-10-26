import { BigjpgError } from "./errors"
import type {
    BigjpgClientOptions,
    BigjpgTask,
    BigjpgTaskStatus,
    CreateTaskOptions,
    CreateTaskResult,
    EnlargeOptions,
    UploadOptions,
    WaitOptions,
} from "./types"

const DEFAULT_BASE_URL = "https://bigjpg.com"
const MAX_BATCH = 100
const SCALE_TO_X2 = { 2: 1, 4: 2, 8: 3, 16: 4 } as const

type TaskPayload =
    | [BigjpgTaskStatus, string?, (string | number)?]
    | { status: BigjpgTaskStatus; url?: string; size?: number | string }

const sleep =(ms: number, signal?: AbortSignal) =>
    new Promise<void>((resolve, reject) => {
        if (signal?.aborted) return reject(signal.reason)
        const timer = setTimeout(resolve, ms)
        signal?.addEventListener(
            "abort",
            () => {
                clearTimeout(timer)
                reject(signal.reason)
            },
            { once: true },
        )
    })

export class BigjpgOpen {
    private readonly apiKey: string
    private readonly baseUrl: string
    private readonly fetchFn: typeof fetch

    constructor(options: BigjpgClientOptions) {
        this.apiKey = options.apiKey
        this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "")
        this.fetchFn = options.fetch ?? fetch
    }

    private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
        const response = await this.fetchFn(`${this.baseUrl}${path}`, {
            ...init,
            headers: { "X-API-KEY": this.apiKey, ...init.headers },
        })

        const text = await response.text()
        let body: any
        try {
            body = JSON.parse(text)
        } catch {
            throw new BigjpgError("unexpected_response", `Unexpected response (${response.status}): ${text.slice(0, 200)}`)
        }

        // Errors are reported through the `status` field (e.g. `param_error`).
        if (body && typeof body.status === "string" && body.status !== "ok" && !("tid" in body)) {
            throw new BigjpgError(body.status)
        }

        return body as T
    }

    /** Uploads a local image and returns a public URL usable as `input`. */
    async upload(options: UploadOptions): Promise<string> {
        const form = new URLSearchParams({ filename: options.filename, filetype: options.filetype })
        const { url, fileurl } = await this.request<{ url: string; fileurl: string }>("/api/img_upload", {
            method: "POST",
            body: form,
        })

        if (!url || !fileurl) throw new BigjpgError("unexpected_response", "Upload response missing url/fileurl")

        const put = await this.fetchFn(url, {
            method: "PUT",
            headers: { "Content-Type": options.filetype },
            body: options.data as Blob,
        })

        if (!put.ok) throw new BigjpgError("upload_failed", `Upload failed with status ${put.status}`)

        return fileurl
    }

    async createTask(options: CreateTaskOptions): Promise<CreateTaskResult> {
        const body: Record<string, unknown> = {
            style: options.style ?? "art",
            noise: options.noise ?? 3,
            x2: SCALE_TO_X2[options.scale ?? 2],
            input: options.input,
        }
        if (options.fileName) body.file_name = options.fileName

        const result = await this.request<{ tid: string; minute: number; remaining_api_calls: number }>("/api/task/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        })

        return { tid: result.tid, minute: result.minute, remainingApiCalls: result.remaining_api_calls }
    }

    /** Queries up to 100 tasks at once. */
    async getTasks(ids: string[]): Promise<BigjpgTask[]> {
        const tasks: BigjpgTask[] = []

        for (let i = 0; i < ids.length; i += MAX_BATCH) {
            const chunk = ids.slice(i, i + MAX_BATCH)
            const result = await this.request<Record<string, TaskPayload>>(`/api/task/${chunk.join(",")}`)

            for (const id of chunk) {
                const raw = result[id]
                if (!raw) continue
                // The site returns `[status, url, size]`; the docs describe an object. Accept both.
                const [status, url, size] = Array.isArray(raw) ? raw : [raw.status, raw.url, raw.size]
                tasks.push({ id, status, url: url || null, size: size ? Number(size) : null })
            }
        }

        return tasks
    }

    async getTask(id: string): Promise<BigjpgTask> {
        const [task] = await this.getTasks([id])
        if (!task) throw new BigjpgError("unexpected_response", `Task ${id} not found in response`)
        return task
    }

    /** Retries failed tasks (up to 100 per request). */
    async retryTasks(ids: string[]): Promise<void> {
        for (let i = 0; i < ids.length; i += MAX_BATCH) {
            await this.request(`/api/task/${ids.slice(i, i + MAX_BATCH).join(",")}`, { method: "POST" })
        }
    }

    /** Polls until the task succeeds. Throws if it errors or the timeout elapses. */
    async waitForTask(id: string, options: WaitOptions = {}): Promise<BigjpgTask> {
        const { interval = 3000, timeout = 10 * 60 * 1000, signal } = options
        const deadline = Date.now() + timeout

        while (true) {
            const task = await this.getTask(id)
            if (task.status === "success") return task
            if (task.status === "error") throw new BigjpgError("task_failed", `Task ${id} failed`)
            if (Date.now() + interval > deadline) throw new BigjpgError("timeout", `Task ${id} timed out`)
            await sleep(interval, signal)
        }
    }

    /** Uploads (if needed), creates the task and waits for the enlarged image. */
    async enlarge(options: EnlargeOptions): Promise<BigjpgTask> {
        const { input, interval, timeout, signal, ...taskOptions } = options
        const url = typeof input === "string" ? input : await this.upload(input)
        const { tid } = await this.createTask({ ...taskOptions, input: url })
        return this.waitForTask(tid, { interval, timeout, signal })
    }
}
