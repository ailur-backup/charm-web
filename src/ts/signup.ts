import {hashPassword} from "./users-common"
import {error, lock, status} from "./common"
import {signup} from "./users-common"

try {
    (<HTMLButtonElement>document.getElementById("signup")).addEventListener("click", lock(async () => {
        try {
            const username = (<HTMLInputElement>document.getElementById("username")).value
            const password = (<HTMLInputElement>document.getElementById("password")).value
            const instance = (<HTMLInputElement>document.getElementById("instance")).value
            status("Hashing password...")
            const key = await hashPassword(username, password)
            return signup(username, key, new URL(instance))
        } catch (e) {
            error(e)
        }
    }))
} catch (e) {
    error(e)
}