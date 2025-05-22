import {error, perform_request} from './common';

try {
    let instance = localStorage.getItem("instance");
    if (instance === null || localStorage.getItem("certificate") === null) {
        window.location.href = "/login";
    } else {
        document.getElementById("greeting").innerText = "Welcome, " + localStorage.getItem("username");
        document.getElementById("logout").addEventListener("click", () => {
            try {
                localStorage.removeItem("username");
                localStorage.removeItem("key");
                localStorage.removeItem("certificate");
                localStorage.removeItem("instance");
                window.location.href = "/login";
            } catch (e) {
                error(e);
            }
        });
        document.getElementById("delete").addEventListener("click", () => {
            try {
                if (confirm("Are you sure you want to delete your account?")) {
                    perform_request(new URL("/api/v1/users/delete", instance), {}).then(() => {
                        localStorage.removeItem("username");
                        localStorage.removeItem("key");
                        localStorage.removeItem("certificate");
                        localStorage.removeItem("instance");
                        window.location.href = "/login";
                    });
                }
            } catch (e) {
                error(e);
            }
        });
    }
} catch (e) {
    error(e);
}