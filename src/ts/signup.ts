import {hash_password} from "./users-common";
import {error, status} from "./common";
import {signup} from "./users-common";

try {
    (<HTMLButtonElement>document.getElementById("signup")).addEventListener("click", async () => {
        try {
            let username = (<HTMLInputElement>document.getElementById("username")).value;
            let password = (<HTMLInputElement>document.getElementById("password")).value;
            let instance = (<HTMLInputElement>document.getElementById("instance")).value;
            status("Hashing password...");
            let key = await hash_password(username, password);
            return signup(username, key, instance);
        } catch (e) {
            error(e);
        }
    });
} catch (e) {
    error(e);
}