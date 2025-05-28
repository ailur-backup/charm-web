import {signAsync} from "@noble/ed25519";
import {message} from "bubblepop";

const statusBox: HTMLElement = document.getElementById("status")

export function status(msg: string) {
    statusBox.innerText = msg
    if (statusBox.hidden) {
        statusBox.hidden = false
    }
}

export function error(msg: string) {
    message(msg).then(() => {
        if (statusBox) {
            statusBox.hidden = true
        }
    })
    throw new Error(msg)
}

function b64_to_uint8(str: string): Uint8Array {
    let b64 = atob(str)
    let arr = new Uint8Array(b64.length)
    for (let i = 0; i < b64.length; i++) {
        arr[i] = b64.charCodeAt(i)
    }
    return arr
}

export function uint8_to_b64(arr: Uint8Array): string {
    let b64 = ''
    for (let i = 0; i < arr.length; i++) {
        b64 += String.fromCharCode(arr[i])
    }
    return btoa(b64)
}

function string_to_uint8(str: string): Uint8Array {
    let arr = new Uint8Array(str.length)
    for (let i = 0; i < str.length; i++) {
        arr[i] = str.charCodeAt(i)
    }
    return arr
}

function uint8_to_array(arr: Uint8Array): Array<number> {
    let array = new Array<number>(arr.length)
    for (let i = 0; i < arr.length; i++) {
        array[i] = arr[i]
    }
    return array
}

export async function new_request_body(data: Object): Promise<Object> {
    try {
        return {
            data: data,
            certificate: JSON.parse(localStorage.getItem('certificate')),
            signature: uint8_to_array(await signAsync(string_to_uint8(JSON.stringify(data)), b64_to_uint8(localStorage.getItem('key'))))
        }
    } catch (e) {
        error(e)
    }
}

export async function perform_request(url: URL, data: Object): Promise<Response> {
    return fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(await new_request_body(data))
    })
}