import {error, new_request_body, perform_request, status} from './common'

let username: string;
let current_space: Space;
let current_room: string;

class Space {
    image: URL
    name: string
}

type Tooltip = HTMLDivElement & {
    space_name: HTMLParagraphElement
}

function theme_svgs() {
    let svgs = document.getElementsByTagName("object")
    for (let i = 0; i < svgs.length; i++) {
        let svg = svgs[i]
        if (svg.classList.contains("theme-svg")) {
            svg.getSVGDocument().getElementById("color").setAttribute("fill", "var(--base)")
        }
    }
}

function load_spaces(instance: URL, spaces: HTMLDivElement, tooltip: Tooltip, rooms: HTMLDivElement, messages: HTMLDivElement, input_container: HTMLDivElement) {
    // Spaces are disabled during beta testing
    let example_space = new Space()
    example_space.image = new URL("https://placehold.co/512x512")
    example_space.name = "Example Space"
    add_space(example_space, instance, spaces, tooltip, rooms, messages, input_container)
}

function add_space(space: Space, instance: URL, spaces: HTMLDivElement, tooltip: Tooltip, rooms: HTMLDivElement, messages: HTMLDivElement, input_container: HTMLDivElement) {
    let image = document.createElement("img")
    image.src = space.image.toString()
    image.alt = space.name
    image.addEventListener("click", async () => {
        try {
            return open_space(space, instance, rooms, messages, input_container)
        } catch (e) {
            error(e)
        }
    })
    image.addEventListener("mouseenter", () => {
        tooltip.hidden = false
        tooltip.style.transform = `translate(${image.offsetLeft + 35}px, ${image.offsetTop + 25}px)`
        tooltip.space_name.innerText = space.name
    })
    image.addEventListener("mouseleave", () => {
        tooltip.hidden = true
    })
    spaces.insertBefore(image, spaces.lastElementChild)
}

async function open_space(space: Space, instance: URL, rooms: HTMLDivElement, messages: HTMLDivElement, input_container: HTMLDivElement) {
    let current_rooms = rooms.getElementsByTagName("button")
    for (let i = current_rooms.length - 1; i >= 0; i--) {
        current_rooms[i].remove()
    }
    const response = await perform_request(new URL("api/v1/rooms/list", instance), 0)
    if (response.status === 200) {
        const data = await response.json()
        if (data.data.length > 0) {
            (<HTMLSpanElement>rooms.firstElementChild).hidden = true
        }
        for (const room of data.data) {
            try {
                add_room(<string>room.name, instance, rooms, messages, input_container)
            } catch (e) {
                error(e)
            }
        }
        current_space = space
    } else {
        error("Failed to load rooms")
    }
}

function add_room(room: string, instance: URL, rooms: HTMLDivElement, messages: HTMLDivElement, input_container: HTMLDivElement) {
    let button = document.createElement("button")
    button.innerText = room
    button.addEventListener("click", async () => {
        try {
            return open_room(room, instance, messages, input_container)
        } catch (e) {
            error(e)
        }
    })
    rooms.appendChild(button)
}

let active_socket: WebSocket | null = null

async function listen_to_room(room: string, instance: URL, messages: HTMLDivElement) {
    if (active_socket) {
        active_socket.close()
    }
    instance = new URL(instance.toString())
    instance.protocol = instance.protocol === "https:" ? "wss:" : "ws:"
    const socket = new WebSocket(new URL("api/v1/messages/listen", instance))
    socket.onopen = async () => {
        status("Connected to room: " + room)
        socket.send(JSON.stringify(await new_request_body({
            name: room
        })))
    }
    socket.onmessage = async (event) => {
        try {
            let data = JSON.parse(event.data)
            if (data.sender.username !== username) {
                let msg = new message()
                msg.sender = data.sender.username
                msg.content = data.content
                msg.timestamp = new Date(0)
                add_message(msg, messages)
                messages.scrollTo(0, messages.scrollHeight)
            }
        } catch (e) {
            error(e)
        }
    }
    socket.onerror = (event) => {
        status("Error when listening to room: " + room)
    }
    socket.onclose = (event) => {
        status("Disconnected from room: " + room)
    }
    active_socket = socket
}

async function open_room(room: string, instance: URL, messages: HTMLDivElement, input_container: HTMLDivElement) {
    if (active_socket) {
        active_socket.close()
    }
    let current_messages = messages.getElementsByTagName("div")
    for (let i = current_messages.length - 1; i >= 0; i--) {
        current_messages[i].remove()
    }
    const response = await perform_request(new URL("api/v1/messages/list", instance), {
        name: room
    })
    if (response.status === 200) {
        const data = await response.json()
        if (data.data.length > 0) {
            (<HTMLSpanElement>messages.firstElementChild).hidden = true
        }
        for (const messageData of data.data) {
            let msg = new message()
            msg.sender = messageData["sender"]["username"]
            msg.content = messageData["content"]
            msg.timestamp = new Date(0)
            add_message(msg, messages)
        }
        current_room = room
    } else {
        error("Failed to load messages")
    }
    messages.scrollTo(0, messages.scrollHeight)
    return listen_to_room(room, instance, messages)
}

class message {
    sender: string
    content: string
    timestamp: Date
}

function add_message(message: message, messages: HTMLDivElement) {
    let message_container = document.createElement("div")
    message_container.classList.add("message")
    let image = document.createElement("img")
    image.src = "https://placehold.co/512x512"
    image.alt = message.sender
    message_container.appendChild(image)
    let text = document.createElement("div")
    text.classList.add("text")
    let message_header = document.createElement("div")
    message_header.classList.add("message-header")
    let username = document.createElement("p")
    username.innerText = message.sender
    let timestamp = document.createElement("p")
    timestamp.innerText = message.timestamp.toLocaleString()
    message_header.appendChild(username)
    message_header.appendChild(timestamp)
    text.appendChild(message_header)
    let content = document.createElement("p")
    content.innerText = message.content
    text.appendChild(content)
    message_container.appendChild(text)
    messages.appendChild(message_container)
}

(async () => {
    try {
        theme_svgs()
        try {
            let certificate = JSON.parse(localStorage.getItem("certificate"))
            username = certificate["components"]["user"]["username"]
        } catch (e) {
            error("Failed to load username: " + e)
        }
        let instance = new URL(localStorage.getItem("instance"))
        if (instance === null || localStorage.getItem("certificate") === null) {
            window.location.href = "/login"
        } else {
            let connection_status_dot = <HTMLDivElement>document.getElementById("connection-status-dot")
            let connection_status = <HTMLParagraphElement>document.getElementById("connection-status")
            let message_contents = <HTMLInputElement>document.getElementById("message")
            let input_container = <HTMLDivElement>document.getElementById("input-container")
            let send = <HTMLImageElement>document.getElementById("send")
            let messages = <HTMLDivElement>document.getElementById("messages")
            let rooms = <HTMLDivElement>document.getElementById("rooms")
            let spaces = <HTMLDivElement>document.getElementById("spaces")
            let settings = <HTMLImageElement>document.getElementById("settings")
            let tooltip = <Tooltip>document.getElementById("tooltip")
            tooltip.space_name = <HTMLParagraphElement>document.getElementById("space-name")
            // run a connectivity test on the instance
            // we will use this to change the color of the connection status dot
            let response
            try {
                response = await fetch(instance + "api/v1/server/ping")
                if (response.status === 200) {
                    connection_status_dot.classList.remove("red")
                    connection_status_dot.classList.add("green")
                    connection_status.innerText = "Connected"
                } else {
                    connection_status_dot.classList.remove("green")
                    connection_status_dot.classList.add("red")
                    connection_status.innerText = `Failed to connect (${response.status})`
                }
            } catch (e) {
                connection_status_dot.classList.remove("green")
                connection_status_dot.classList.add("red")
                connection_status.innerText = `Failed to connect (${e})`
            }
            load_spaces(instance, spaces, tooltip, rooms, messages, input_container)
            const send_message = async () => {
                console.log("Preparing to send message")
                let message_content = message_contents.value
                if (message_content.length === 0) {
                    return
                }
                console.log("Message content: " + message_content)
                let response
                try {
                    console.log("Sending message: " + message_content)
                    console.log("Url: " + new URL("api/v1/messages/send", instance))
                    response = await perform_request(new URL("api/v1/messages/send", instance), {
                        room: {
                            name: current_room
                        },
                        content: message_content
                    })
                    console.log("Message sent, response status: " + response.status)
                } catch (e) {
                    console.error("Error sending message:", e)
                    error(e)
                }
                console.log("Processing response")
                if (response.status === 201) {
                    try {
                        let msg = new message()
                        msg.sender = localStorage.getItem("username")
                        msg.content = message_content
                        msg.timestamp = new Date(0)
                        add_message(msg, messages)
                        message_contents.value = ""
                        messages.scrollTo(0, messages.scrollHeight)
                    } catch (e) {
                        error(e)
                    }
                } else {
                    error("Failed to send message")
                }
            }
            send.addEventListener("click", send_message)
            message_contents.addEventListener("keypress", async (e) => {
                console.log("Key pressed: " + e.key)
                if (e.key === "Enter") {
                    console.log("Sending message on Enter key press")
                    return send_message()
                }
            })
        }
    } catch (e) {
        error(e)
    }
})()