import {error, getTheme, lock, status} from "./common"
import {hashPassword, login} from "./users-common"

try {
    (<HTMLButtonElement>document.getElementById("login")).addEventListener("click", lock(async () => {
        try {
            const username = (<HTMLInputElement>document.getElementById("username")).value
            const password = (<HTMLInputElement>document.getElementById("password")).value
            const instance = (<HTMLInputElement>document.getElementById("instance")).value
            status("Hashing password...")
            return login(username, await hashPassword(username, password), new URL(instance))
        } catch (e) {
            error(e)
        }
    }))
} catch (e) {
    error(e)
}