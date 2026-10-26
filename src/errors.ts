export type BigjpgErrorCode =
    | "valid_api_key_required"
    | "requires_vip"
    | "month_limit"
    | "param_error"
    | "input_url_error"
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
