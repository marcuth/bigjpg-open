export type BigjpgStyle = "art" | "photo"

/** -1 = none, 0 = low, 1 = medium, 2 = high, 3 = highest */
export type BigjpgNoise = -1 | 0 | 1 | 2 | 3

/** Enlargement factor (the site's `x2` field). */
export type BigjpgScale = 2 | 4 | 8 | 16

export type BigjpgTaskStatus = "new" | "process" | "success" | "error"

export type BigjpgClientOptions = {
    baseUrl?: string
    fetch?: typeof fetch
}

export type ImageData = {
    data: Uint8Array
    filename: string
    /** MIME type, e.g. `image/png`. */
    filetype: string
    /** Read from the image header when omitted (PNG, JPEG, GIF, WebP). */
    width?: number
    height?: number
}

export type UploadResult = {
    /** Public URL of the uploaded file, used as the task input. */
    fileUrl: string
}

export type CreateTaskOptions = {
    /** `fileUrl` returned by `upload`. */
    input: string
    fileName: string
    fileSize: number
    width: number
    height: number
    style?: BigjpgStyle
    noise?: BigjpgNoise
    scale?: BigjpgScale
}

export type CreateTaskResult = {
    tid: string
    /** Estimated processing time in minutes. */
    minute: number
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

export type EnlargeOptions = WaitOptions &
    Pick<CreateTaskOptions, "style" | "noise" | "scale"> & {
        /** Image bytes, or an http(s) URL that will be downloaded and uploaded. */
        input: string | ImageData
    }
