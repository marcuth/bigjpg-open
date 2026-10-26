import { BigjpgError } from "./errors"
import { getImageSize } from "./image-size"
import type {
    BigjpgClientOptions,
    BigjpgTask,
    BigjpgTaskStatus,
    CreateTaskOptions,
    CreateTaskResult,
    EnlargeOptions,
    ImageData,
    UploadResult,
    WaitOptions,
} from "./types"

const DEFAULT_BASE_URL = "https://bigjpg.com"
const HEADERS = {
    Referer: "https://bigjpg.com/",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36",
    Accept: "application/json, text/plain, */*",
}

const sleep = (ms: number, signal?: AbortSignal) =>
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
    private readonly baseUrl: string
    private readonly fetchFn: typeof fetch

    constructor(options: BigjpgClientOptions = {}) {
        this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "")
        this.fetchFn = options.fetch ?? fetch
    }

    private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
        const response = await this.fetchFn(`${this.baseUrl}${path}`, {
            ...init,
            headers: { ...HEADERS, ...init.headers },
        })

        const text = await response.text()
        let body: any
        try {
            body = JSON.parse(text)
        } catch {
            throw new BigjpgError("unexpected_response", `Unexpected response (${response.status}): ${text.slice(0, 200)}`)
        }

        if (body && typeof body.status === "string" && body.status !== "ok") {
            throw new BigjpgError(body.status)
        }

        return body as T
    }

    /** Uploads an image to Bigjpg's storage. */
    async upload(image: Pick<ImageData, "data" | "filename" | "filetype">): Promise<UploadResult> {
        const { url, fileurl } = await this.request<{ url: string; fileurl: string }>("/api/sign_upload", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
            body: new URLSearchParams({ filename: image.filename, filetype: image.filetype }),
        })

        if (!url || !fileurl) throw new BigjpgError("unexpected_response", "sign_upload response missing url/fileurl")

        const put = await this.fetchFn(url, {
            method: "PUT",
            headers: { "Content-Type": image.filetype },
            body: image.data as Uint8Array<ArrayBuffer>,
        })

        if (!put.ok) throw new BigjpgError("upload_failed", `Upload failed with status ${put.status}`)

        return { fileUrl: fileurl }
    }

    async createTask(options: CreateTaskOptions): Promise<CreateTaskResult> {
        const conf = {
            x2: String(options.scale ?? 2),
            style: options.style ?? "art",
            noise: String(options.noise ?? 0),
            file_name: options.fileName,
            files_size: options.fileSize,
            file_height: options.height,
            file_width: options.width,
            input: options.input,
            storage: "oss",
        }

        const result = await this.request<{ info: string; time: number }>("/task", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
            body: new URLSearchParams({ conf: JSON.stringify(conf) }),
        })

        return { tid: result.info, minute: result.time }
    }

    async getTasks(ids: string[]): Promise<BigjpgTask[]> {
        const result = await this.request<Record<string, [BigjpgTaskStatus, string?, (string | number)?]>>(
            `/free?fids=${encodeURIComponent(JSON.stringify(ids))}`,
        )

        return ids.flatMap((id) => {
            const raw = result[id]
            if (!raw) return []
            const [status, url, size] = raw
            return [{ id, status, url: url || null, size: size ? Number(size) : null }]
        })
    }

    async getTask(id: string): Promise<BigjpgTask> {
        const [task] = await this.getTasks([id])
        if (!task) throw new BigjpgError("unexpected_response", `Task ${id} not found in response`)
        return task
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

    private async download(url: string): Promise<ImageData> {
        const response = await this.fetchFn(url)
        if (!response.ok) throw new BigjpgError("download_failed", `Download failed with status ${response.status}`)

        const filetype = response.headers.get("content-type")?.split(";")[0].trim() || "image/png"
        const name = new URL(response.url || url).pathname.split("/").pop() || "image"
        const filename = name.includes(".") ? name : `${name}.${filetype.split("/")[1] ?? "png"}`

        return { data: new Uint8Array(await response.arrayBuffer()), filename, filetype }
    }

    /** Uploads the image (downloading it first if given a URL), creates the task and waits for the result. */
    async enlarge(options: EnlargeOptions): Promise<BigjpgTask> {
        const { input, interval, timeout, signal, ...taskOptions } = options
        const image = typeof input === "string" ? await this.download(input) : input

        const size = image.width && image.height ? { width: image.width, height: image.height } : getImageSize(image.data)
        if (!size) throw new BigjpgError("unknown_image_size", "Could not read image size; pass width and height")

        const { fileUrl } = await this.upload(image)
        const { tid } = await this.createTask({
            ...taskOptions,
            input: fileUrl,
            fileName: image.filename,
            fileSize: image.data.byteLength,
            ...size,
        })

        return this.waitForTask(tid, { interval, timeout, signal })
    }
}
