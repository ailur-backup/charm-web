import {error, perform_request, status} from './common';

class Space {
    image: URL
    name: string
}

type Tooltip = HTMLDivElement & {
    space_name: HTMLParagraphElement
}

function theme_svgs() {
    let svgs = document.getElementsByTagName("object");
    for (let i = 0; i < svgs.length; i++) {
        let svg = svgs[i];
        if (svg.classList.contains("theme-svg")) {
            svg.getSVGDocument().getElementById("color").setAttribute("fill", "var(--base)");
        }
    }
}

function load_spaces(instance: URL, spaces: HTMLDivElement, tooltip: Tooltip, rooms: HTMLDivElement, messages: HTMLDivElement, input_container: HTMLDivElement) {
    // Spaces are disabled during beta testing
    let example_space = new Space();
    example_space.image = new URL("https://placehold.co/512x512");
    example_space.name = "Example Space";
    try {
        add_space(example_space, instance, spaces, tooltip, rooms, messages, input_container);
    } catch (e) {
        error(e);
    }
}

function add_space(space: Space, instance: URL, spaces: HTMLDivElement, tooltip: Tooltip, rooms: HTMLDivElement, messages: HTMLDivElement, input_container: HTMLDivElement) {
    let image = document.createElement("img");
    image.src = space.image.toString();
    image.alt = space.name;
    image.onclick = () => {
        try {
            open_space(space, instance, rooms, messages, input_container);
        } catch (e) {
            error(e);
        }
    }
    image.onmouseover = () => {
        tooltip.hidden = false;
        tooltip.style.transform = `translate(${image.offsetLeft + 35}px, ${image.offsetTop + 25}px)`;
        tooltip.space_name.innerText = space.name;
    }
    image.onmouseleave = () => {
        tooltip.hidden = true;
    }
    spaces.insertBefore(image, spaces.lastElementChild);
}

function open_space(space: Space, instance: URL, rooms: HTMLDivElement, messages: HTMLDivElement, input_container: HTMLDivElement) {
    let current_rooms = rooms.getElementsByTagName("button");
    for (let i = current_rooms.length - 1; i >= 0; i--) {
        current_rooms[i].remove();
    }
    perform_request(new URL("api/v1/rooms/list", instance), 0).then((response) => {
        if (response.status === 200) {
            response.json().then((data) => {
                if (data["message"].length > 0) {
                    (<HTMLSpanElement>rooms.firstElementChild).hidden = true;
                }
                console.log(data.message);
                for (const room of data.message) {
                    try {
                        console.log(room);
                        add_room(<string>room.name, instance, rooms, messages, input_container);
                    } catch (e) {
                        error(e);
                    }
                }
            });
        } else {
            error("Failed to load rooms");
        }
    })
}

function add_room(room: string, instance: URL, rooms: HTMLDivElement, messages: HTMLDivElement, input_container: HTMLDivElement) {
    let button = document.createElement("button");
    button.innerText = room;
    button.onclick = () => {
        open_room(room, instance, messages, input_container);
    }
    rooms.appendChild(button);
}

function open_room(room: string, instance: URL, messages: HTMLDivElement, input_container: HTMLDivElement) {
    let current_messages = messages.getElementsByTagName("p");
    for (let i = current_messages.length - 1; i >= 0; i--) {
        current_messages[i].remove();
    }
    perform_request(new URL("api/v1/messages/list", instance), {
        name: room
    }).then((response) => {
        if (response.status === 200) {
            response.json().then((data) => {
                if (data.message.length > 0) {
                    (<HTMLSpanElement>messages.firstElementChild).hidden = true;
                }
                for (const message of data.message) {
                    let msg = new message();
                    msg.sender = message["sender"]["username"];
                    msg.content = message["content"];
                    msg.timestamp = Date.parse("1970-01-01T00:00:00.000Z");
                    add_message(msg, messages);
                }
            });
        } else {
            error("Failed to load messages");
        }
    })
}

class message {
    sender: string
    content: string
    timestamp: Date
}

function add_message(message: message, messages: HTMLDivElement) {
    let message_container = document.createElement("div");
    message_container.classList.add("message");
    let image = document.createElement("img");
    image.src = "https://placehold.co/512x512";
    image.alt = message.sender;
    message_container.appendChild(image);
    let text = document.createElement("div");
    text.classList.add("text");
    let message_header = document.createElement("div");
    message_header.classList.add("message-header");
    let username = document.createElement("p");
    username.innerText = message.sender;
    let timestamp = document.createElement("p");
    timestamp.innerText = message.timestamp.toLocaleString();
    message_header.appendChild(username);
    message_header.appendChild(timestamp);
    text.appendChild(message_header);
    let content = document.createElement("p");
    content.innerText = message.content;
    text.appendChild(content);
    message_container.appendChild(text);
}

(async () => {
    try {
        theme_svgs();
    } catch (e) {
        error(e);
    }
    try {
        let instance = new URL(localStorage.getItem("instance"));
        if (instance === null || localStorage.getItem("certificate") === null) {
            window.location.href = "/login";
        } else {
            let connection_status_dot: HTMLDivElement
            let connection_status: HTMLParagraphElement
            let message: HTMLInputElement
            let input_container: HTMLDivElement
            let send: HTMLImageElement
            let messages: HTMLDivElement
            let rooms: HTMLDivElement
            let spaces: HTMLDivElement
            let settings: HTMLImageElement
            let tooltip: Tooltip
            try {
                connection_status_dot = <HTMLDivElement>document.getElementById("connection-status-dot");
                connection_status = <HTMLParagraphElement>document.getElementById("connection-status");
                message = <HTMLInputElement>document.getElementById("message");
                input_container = <HTMLDivElement>document.getElementById("input-container");
                send = <HTMLImageElement>document.getElementById("send");
                messages = <HTMLDivElement>document.getElementById("messages");
                rooms = <HTMLDivElement>document.getElementById("rooms");
                spaces = <HTMLDivElement>document.getElementById("spaces");
                settings = <HTMLImageElement>document.getElementById("settings");
                tooltip = <Tooltip>document.getElementById("tooltip");
                tooltip.space_name = <HTMLParagraphElement>document.getElementById("space-name");
            } catch (e) {
                error(e);
            }
            // run a connectivity test on the instance
            // we will use this to change the color of the connection status dot
            status("Connecting to " + instance)
            let response
            try {
                response = await fetch(instance + "api/v1/server/ping")
            } catch (e) {
                connection_status_dot.classList.remove("green");
                connection_status_dot.classList.add("red");
                connection_status.innerText = `Failed to connect (${e})`;
                error(e);
            }
            if (response.status === 200) {
                connection_status_dot.classList.remove("red");
                connection_status_dot.classList.add("green");
                connection_status.innerText = "Connected";
            } else {
                connection_status_dot.classList.remove("green");
                connection_status_dot.classList.add("red");
                connection_status.innerText = `Failed to connect (${response.status})`;
            }
            try {
                load_spaces(instance, spaces, tooltip, rooms, messages, input_container);
            } catch (e) {
                error(e);
            }
        }
    } catch (e) {
        error(e);
    }
})()