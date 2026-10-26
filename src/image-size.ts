export type Dimensions = { width: number; height: number }

const view = (data: Uint8Array) => new DataView(data.buffer, data.byteOffset, data.byteLength)

function png(data: Uint8Array): Dimensions | null {
    if (data.length < 24 || data[0] !== 0x89 || data[1] !== 0x50) return null
    const v = view(data)
    return { width: v.getUint32(16), height: v.getUint32(20) }
}

function gif(data: Uint8Array): Dimensions | null {
    if (data.length < 10 || data[0] !== 0x47 || data[1] !== 0x49) return null
    const v = view(data)
    return { width: v.getUint16(6, true), height: v.getUint16(8, true) }
}

function jpeg(data: Uint8Array): Dimensions | null {
    if (data.length < 4 || data[0] !== 0xff || data[1] !== 0xd8) return null
    const v = view(data)
    let offset = 2
    while (offset + 9 < data.length) {
        if (data[offset] !== 0xff) {
            offset++
            continue
        }
        const marker = data[offset + 1]
        // SOF0-SOF15, excluding DHT (c4), JPG (c8) and DAC (cc)
        if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
            return { height: v.getUint16(offset + 5), width: v.getUint16(offset + 7) }
        }
        offset += 2 + v.getUint16(offset + 2)
    }
    return null
}

function webp(data: Uint8Array): Dimensions | null {
    if (data.length < 30 || String.fromCharCode(...data.subarray(8, 12)) !== "WEBP") return null
    const v = view(data)
    const chunk = String.fromCharCode(...data.subarray(12, 16))
    if (chunk === "VP8X") {
        return { width: 1 + (data[24] | (data[25] << 8) | (data[26] << 16)), height: 1 + (data[27] | (data[28] << 8) | (data[29] << 16)) }
    }
    if (chunk === "VP8L") {
        const bits = v.getUint32(21, true)
        return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 }
    }
    if (chunk === "VP8 ") {
        return { width: v.getUint16(26, true) & 0x3fff, height: v.getUint16(28, true) & 0x3fff }
    }
    return null
}

export function getImageSize(data: Uint8Array): Dimensions | null {
    return png(data) ?? jpeg(data) ?? gif(data) ?? webp(data)
}
