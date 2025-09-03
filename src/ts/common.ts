import {signAsync} from "@noble/ed25519"
import {message} from "./prompts"

const statusBox: HTMLElement = document.getElementById("status")

export function status(msg: string) {
    statusBox.innerText = msg
    if (statusBox.classList.contains("hidden")) {
        statusBox.classList.remove("hidden")
    }
}

export function error(msg: string) {
    message({
        title: "Error",
        subtitle: msg
    }).then(() => {
        if (statusBox) {
            statusBox.style.display = "none"
        }
    })
    throw new Error(msg)
}

export function getTheme(): string {
    let theme = localStorage.getItem("theme")
    if (theme === null) {
        localStorage.setItem("theme", "latte")
        theme = "latte"
    } else {
        if (theme !== "latte") {
            document.documentElement.classList.add(theme)
            document.documentElement.classList.remove("latte")
        }
    }
    return theme
}

export function setTheme(theme: string, currentTheme: string) {
    if (currentTheme !== theme) {
        localStorage.setItem("theme", theme)
        document.documentElement.classList.add(theme)
        document.documentElement.classList.remove(currentTheme)
    }
}

function Base64ToUint8(b64: string): Uint8Array {
    const str = atob(b64)
    return stringToUint8(str)
}

export function Uint8ToBase64(arr: Uint8Array): string {
    let b64 = ''
    for (let i = 0; i < arr.length; i++) {
        b64 += String.fromCharCode(arr[i])
    }
    return btoa(b64)
}

export function Base64UrlToArray(b64: string): number[] {
    const str = atob(b64.replace(/_/g, '/').replace(/-/g, '+'))
    const arr = new Array<number>(str.length)
    for (let i = 0; i < str.length; i++) {
        arr[i] = str.charCodeAt(i)
    }
    return arr    
}

export function ArrayToBase64Url(arr: number[]): string {
    let b64 = ''
    for (let i = 0; i < arr.length; i++) {
        b64 += String.fromCharCode(arr[i])
    }
    return btoa(b64).replace(/\//g, '_').replace(/\+/g, '-')
}

function stringToUint8(str: string): Uint8Array {
    const arr = new Uint8Array(str.length)
    for (let i = 0; i < str.length; i++) {
        arr[i] = str.charCodeAt(i)
    }
    return arr
}

function uint8ToArray(arr: Uint8Array): number[] {
    const array = new Array<number>(arr.length)
    for (let i = 0; i < arr.length; i++) {
        array[i] = arr[i]
    }
    return array
}

export async function newRequestBody(data: Object): Promise<Object> {
    try {
        return {
            data: data,
            certificate: JSON.parse(localStorage.getItem('certificate')),
            signature: uint8ToArray(await signAsync(stringToUint8(JSON.stringify(data)), Base64ToUint8(localStorage.getItem('key'))))
        }
    } catch (e) {
        error(e)
    }
}

export async function performRequest(url: URL, data: Object): Promise<Response> {
    return fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(await newRequestBody(data))
    })
}

type AsyncFunction<R, P extends (...args: any) => any> = (...args: Parameters<P>) => Promise<R>;

export function lock<R, P extends (...args: any) => any>(func: AsyncFunction<R, P>): AsyncFunction<R, P> {
    let promise: Promise<R>
    return async (...args: Parameters<P>): Promise<R> => {
        if (promise) {
            return await promise
        } else {
            promise = func(...args)
            const resolve = () => {
                promise = null
            }
            promise.then(resolve, resolve)
            return await promise
        }
    }
}