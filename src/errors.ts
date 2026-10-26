export type BigjpgErrorCode =
    | "upload_failed"
    | "download_failed"
    | "unknown_image_size"
    | "task_failed"
    | "timeout"
    | "unexpected_response"

export class BigjpgError extends Error {
    readonly code: BigjpgErrorCode | string

    constructor(code: BigjpgErrorCode | string, message?: string) {
        super(message ?? code)
        this.name = "BigjpgError"
        this.code = code
    }
}
