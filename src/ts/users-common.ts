import {argon2id, createBLAKE3} from "hash-wasm";
import {getPublicKeyAsync, signAsync} from "@noble/ed25519";
import {error, status, uint8_to_b64} from "./common";

export async function blake3(input: string): Promise<Uint8Array> {
    return (await createBLAKE3()).update(input).digest("binary")
}

export async function hash_password(username: string, password: string): Promise<Uint8Array> {
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

export async function login(username: string, key: Uint8Array, instance: string): Promise<void> {
    status("Generating signature...");
    let signature = Array.from(await signAsync(new Uint8Array(1), key))
    status("Logging in...");
    let response = await fetch(`${instance}/api/v1/users/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            user: {
                username: username,
                server: {
                    domain: instance,
                }
            },
            signature: signature,
            data: 0,
        }),
    })
    if (response.status === 200) {
        status("Login successful!");
        let data = await response.json();
        localStorage.setItem("username", username);
        localStorage.setItem("key", uint8_to_b64(key));
        localStorage.setItem("certificate", JSON.stringify(data));
        localStorage.setItem("instance", instance);
        window.location.href = "/app";
    } else {
        error("Login failed! Status code: " + response.status);
    }
}


export async function signup(username: string, key: Uint8Array, instance: string): Promise<void> {
    status("Generating public key...");
    let pubKey = Array.from(await getPublicKeyAsync(key));
    status("Signing up...");
    let response = await fetch(`${instance}/api/v1/users/create`, {
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
        return login(username, key, instance);
    } else {
        error("Signup failed! Status code: " + response.status);
    }
}

console.log("Adding event listener for signup");