import {error, status} from "./common";
import {hash_password, login} from "./users-common";

try {
    (<HTMLButtonElement>document.getElementById("login")).addEventListener("click", async () => {
        try {
            let username = (<HTMLInputElement>document.getElementById("username")).value;
            let password = (<HTMLInputElement>document.getElementById("password")).value;
            let instance = (<HTMLInputElement>document.getElementById("instance")).value;
            status("Hashing password...");
            return login(username, await hash_password(username, password), instance);
        } catch (e) {
            error(e);
        }
    });
} catch (e) {
    error(e)
}