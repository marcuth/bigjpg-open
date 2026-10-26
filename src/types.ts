export type BigjpgStyle = "art" | "photo"

/** -1 = none, 0 = low, 1 = medium, 2 = high, 3 = highest */
export type BigjpgNoise = -1 | 0 | 1 | 2 | 3

/** Enlargement factor. Free accounts are limited to 2x and 4x. */
export type BigjpgScale = 2 | 4 | 8 | 16

export type BigjpgTaskStatus = "new" | "process" | "success" | "error"

export type BigjpgClientOptions = {
    apiKey: string
    baseUrl?: string
    fetch?: typeof fetch
}

export type UploadOptions = {
    data: Uint8Array | ArrayBuffer | Blob
    filename: string
    /** MIME type, e.g. `image/jpeg`. */
    filetype: string
}

export type CreateTaskOptions = {
    /** Publicly reachable http(s) image URL. */
    input: string
    style?: BigjpgStyle
    noise?: BigjpgNoise
    scale?: BigjpgScale
    fileName?: string
}

export type CreateTaskResult = {
    tid: string
    minute: number
    remainingApiCalls: number
}

export type BigjpgTask = {
    id: string
    status: BigjpgTaskStatus
    url: string | null
    size: number | null
}

export type WaitOptions = {
    /** Polling interval in milliseconds. Defaults to 3000. */
    interval?: number
    /** Maximum time to wait in milliseconds. Defaults to 10 minutes. */
    timeout?: number
    signal?: AbortSignal
}

export type EnlargeOptions = Omit<CreateTaskOptions, "input"> &
    WaitOptions & {
        input: string | UploadOptions
    }
