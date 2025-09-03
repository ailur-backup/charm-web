import {argon2id, createBLAKE3} from "hash-wasm"
import {getPublicKeyAsync, signAsync} from "@noble/ed25519"
import {error, getTheme, status, Uint8ToBase64} from "./common"
import { accept } from "./prompts"

export async function blake3(input: string): Promise<Uint8Array> {
    return (await createBLAKE3()).update(input).digest("binary")
}

export async function hashPassword(username: string, password: string): Promise<Uint8Array> {
    return await argon2id({
        password: password,
        salt: await blake3(username),
        memorySize: 19264,
        iterations: 32,
        parallelism: 1,
        hashLength: 32,
        outputType: "binary"
    })
}

export async function login(username: string, key: Uint8Array, instance: URL): Promise<void> {
    status("Generating signature...")
    const signature = Array.from(await signAsync(new Uint8Array(1), key))
    status("Logging in...")
    let response: Response
    try {
        response = await fetch(new URL("/api/v1/users/login", instance), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user: {
                    username: username,
                    server: {
                        domain: instance.host,
                    }
                },
                signature: signature,
                data: 0,
            }),
        })
    } catch (e) {
        error(`Login failed! ${e}`)
    }
    if (response.status === 200) {
        status("Login successful!")
        const data = await response.json()
        if (data.data.components.user.server.domain !== instance.host) {
            if (!accept({
                title: "Warning",
                subtitle: "The instance URL you provided was not the same as the instance URL the server advertised as. Is this ok?"}
            )) {
                error("Instance is incorrect! Will not proceed.")
            }
        }
        localStorage.setItem("username", username)
        localStorage.setItem("key", Uint8ToBase64(key))
        localStorage.setItem("certificate", JSON.stringify(data.data))
        localStorage.setItem("instance", data.data.components.user.server.domain)
        localStorage.setItem("prefix", instance.protocol)
        window.location.href = "/app"
    } else {
        error("Login failed! Status code: " + response.status)
    }
}

export async function signup(username: string, key: Uint8Array, instance: URL): Promise<void> {
    status("Generating public key...")
    const pubKey = Array.from(await getPublicKeyAsync(key))
    status("Signing up...")
    const response = await fetch(new URL("/api/v1/users/create", instance), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        }, body: JSON.stringify({
            user: {
                username: username,
                server: {
                    domain: instance,
                }
            },
            key: pubKey
        })
    })
    if (response.status === 201) {
        return login(username, key, instance)
    } else {
        error("Signup failed! Status code: " + response.status)
    }
}

getTheme()