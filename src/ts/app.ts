import {ArrayToBase64Url, Base64UrlToArray, error, getTheme, lock, newRequestBody, performRequest as performRequest, setTheme, status} from './common'
import {accept, ask, choice, Close, date, message, upload} from './prompts'

export {
    accept,
    ask,
    choice,
    upload
}

let username: string
let currentRoom: string

class Space {
    image: URL
    name: string
}

type Tooltip = HTMLDivElement & {
    spaceName: HTMLParagraphElement
}

interface ContextMenuListeners {
    invite?: EventListener
    leave?: EventListener
    delete?: EventListener
}


type ContextMenu = HTMLDivElement & {
    invite: HTMLButtonElement
    leave: HTMLButtonElement
    delete: HTMLButtonElement
}

function hideContextMenu(menu: ContextMenu, listeners: ContextMenuListeners) {
    menu.classList.add("hidden")
    if (listeners.delete) menu.delete.removeEventListener("click", listeners.delete)
    if (listeners.invite) menu.invite.removeEventListener("click", listeners.invite)
    if (listeners.leave) menu.leave.removeEventListener("click", listeners.leave)
}

function unhideContextMenu(menu: ContextMenu, coordinates: [number, number], listeners: ContextMenuListeners, onhide?: Close) {
    if (listeners.invite) {
        menu.invite.classList.remove("hidden")
        menu.invite.addEventListener("click", listeners.invite)
    } else {
        menu.invite.classList.add("hidden")
    }

    if (listeners.leave) {
        menu.leave.classList.remove("hidden")
        menu.leave.addEventListener("click", listeners.leave)
    } else {
        menu.leave.classList.add("hidden")
    }

    if (listeners.delete) {
        menu.delete.classList.remove("hidden")
        menu.delete.addEventListener("click", listeners.delete)
    } else {
        menu.delete.classList.add("hidden")
    }

    menu.classList.remove("hidden")
    menu.style.transform = `translate(${coordinates[0]}px, ${coordinates[1]}px)`

    document.addEventListener("click", (e) => {
        if (e.target instanceof HTMLElement && !((e.target).closest("#rightclick"))) {
            if (onhide) onhide()
            hideContextMenu(menu, listeners)
        }
    })
        
    document.addEventListener("keyup", (e) => {
        if (e.key === "Escape") {
            if (onhide) onhide()
            hideContextMenu(menu, listeners)
        }
    })

    document.addEventListener("contextmenu", () => {
        if (onhide) onhide()
        hideContextMenu(menu, listeners)
    })
}

function themeSvgs() {
    document.querySelectorAll(".svg-button-image").forEach(async (svg: HTMLEmbedElement) => {
        if (svg.getSVGDocument() == null) {
            await new Promise((resolve) => {
                svg.onload = resolve
            })
        }
        svg.getSVGDocument().querySelectorAll(".color").forEach((e) => {
            e.setAttribute("fill", getComputedStyle(document.body).getPropertyValue("--text"))
        })
    })
}

async function loadSpaces(instance: URL, server: string, spaces: HTMLDivElement, tooltip: Tooltip, rooms: HTMLDivElement, messages: HTMLDivElement, messageContents: HTMLInputElement, send: HTMLImageElement, messagesContainer: HTMLDivElement, back: HTMLDivElement, titlebar: HTMLHeadingElement, rightClick: ContextMenu) {
    const response = await performRequest(new URL("api/v1/spaces/list", instance), 0)
    if (response.status === 200) {
        const data = await response.json()
        for (const space of data.data) {
            try {
                const spaceObj = new Space()
                spaceObj.image = new URL(space.image)
                spaceObj.name = space.space.name
                addSpace(spaceObj, instance, server, spaces, tooltip, rooms, messages, messageContents, send, messagesContainer, back, titlebar, rightClick)
            } catch (e) {
                error(e)
            }
        }
    } else {
        error(`Failed to load rooms: ${(await response.json()).data}`)
    }
}

let activeSpace: Space

function removeSpace(image: HTMLImageElement, space: Space, spaces: HTMLDivElement, rooms: HTMLDivElement, messagesContainer: HTMLDivElement, back: HTMLDivElement, titlebar: HTMLHeadingElement) {
    spaces.removeChild(image)
    if (space === activeSpace) {
        messagesContainer.classList.add("hidden")
        titlebar.classList.remove("mobile-hidden")
        back.classList.add("hidden")
        rooms.querySelectorAll("button").forEach((button) => {
            button.remove()
        })
        rooms.firstElementChild.classList.remove("hidden")
    }
}

function addSpace(space: Space, instance: URL, server: string, spaces: HTMLDivElement, tooltip: Tooltip, rooms: HTMLDivElement, messages: HTMLDivElement, messageContents: HTMLInputElement, send: HTMLImageElement, messagesContainer: HTMLDivElement, back: HTMLDivElement, titlebar: HTMLHeadingElement, rightClick: ContextMenu) {
    const image = document.createElement("img")
    image.src = space.image.toString()
    image.alt = space.name
    image.addEventListener("click", lock(async () => {
        try {
            return openSpace(space, instance, server, rooms, messages, messageContents, send, messagesContainer, back, titlebar, rightClick)
        } catch (e) {
            error(e)
        }
    }))
    image.addEventListener("contextmenu", (e: PointerEvent) => {
        e.preventDefault()
        e.stopPropagation()
        image.classList.add("hover")
        unhideContextMenu(rightClick, [
            image.offsetLeft + 35,
            image.offsetTop + 25
        ], {
            leave: lock(async () => {
                try {
                    const response = await performRequest(new URL("api/v1/spaces/leave", instance), {
                        name: space.name,
                        server: {
                            domain: server
                        }
                    })
                    if (response.status === 200) {
                        removeSpace(image, space, spaces, rooms, messagesContainer, back, titlebar)
                    } else {
                        error(`Failed to leave space: ${(await response.json()).data}`)
                    }
                } catch (e) {
                    error(`Failed to leave space: ${e}`)
                }
            }),
            delete: lock(async () => {
                if (await accept({
                    title: "Delete Space",
                    subtitle: "Are you sure you want to delete this space?"
                })) {
                    try {
                        const response = await performRequest(new URL("api/v1/spaces/delete", instance), {
                            name: space.name,
                            server: {
                                domain: server
                            }
                        })
                        if (response.status === 200) {
                            removeSpace(image, space, spaces, rooms, messagesContainer, back, titlebar)
                        } else {
                            error(`Failed to delete space: ${(await response.json()).data}`)
                        }
                    } catch (e) {
                        error(`Failed to delete space: ${e}`)
                    }
                }
            }),
            invite: lock(async () => {
                try {
                    const response = await performRequest(new URL("api/v1/spaces/invite", instance), {
                        space: {
                            name: space.name,
                            server: {
                                domain: server
                            }
                        },
                        expiry_time: ((await date({
                            title: "Invite",
                            subtitle: "Date of invite expiry"
                        })).getTime() / 1000)
                    })
                    if (response.status === 200) {
                        const data = await response.json()
                        const code = ArrayToBase64Url(data.data)
                        const index: number = await choice({
                            title: "Invite",
                            subtitle: `Your invite code is: ${code}`
                        }, [
                            "Copy",
                            "Ok"
                        ], lock(async (index: number, close: Close) => {
                            if (index === 0) {
                                navigator.clipboard.writeText(code)
                                await message({
                                    title: "Invite",
                                    subtitle: "Code copied!"
                                })
                            }
                            close()
                        }))
                    } else {
                        error(`Failed to leave space: ${(await response.json()).data}`)
                    }
                } catch (e) {
                    error(`Failed to leave space: ${e}`)
                }
            })
        }, () => {
            image.classList.remove("hover")
        })
    })
    image.addEventListener("mouseenter", () => {
        tooltip.classList.remove("hidden")
        tooltip.style.transform = `translate(${image.offsetLeft + 35}px, ${image.offsetTop + 25}px)`
        tooltip.spaceName.innerText = space.name
    })
    image.addEventListener("mouseleave", () => {
        tooltip.classList.add("hidden")
    })
    spaces.insertBefore(image, spaces.lastElementChild)
}

async function openSpace(space: Space, instance: URL, server: string, rooms: HTMLDivElement, messages: HTMLDivElement, messageContents: HTMLInputElement, send: HTMLImageElement, messagesContainer: HTMLDivElement, back: HTMLDivElement, titlebar: HTMLHeadingElement, rightClick: ContextMenu) {
    if (activeSocket) {
        activeSocket.close()
        activeSocket = null
    }
    activeSpace = space
    messagesContainer.classList.add("hidden")
    titlebar.classList.remove("mobile-hidden")
    back.classList.add("hidden")
    rooms.querySelectorAll("button").forEach((button) => {
        button.remove()
    })
    rooms.firstElementChild.classList.add("hidden")
    const response = await performRequest(new URL("api/v1/rooms/list", instance), {
        name: space.name,
        server: {
            domain: server
        }
    })
    if (response.status === 200) {
        const createRoom = document.createElement("button")
        createRoom.innerText = "Create new room"
        createRoom.addEventListener("click", lock(async () => {
            const roomName = await ask({
                title: "Create Room"
            }, "Room name")
            const response = await performRequest(new URL("api/v1/rooms/create", instance), {
                name: roomName,
                space: {
                    name: space.name,
                    server: {
                        domain: server
                    }
                }
            })
            if (response.status === 201) {
                try {
                    addRoom(roomName, space, server, createRoom, instance, rooms, messages, messageContents, send, messagesContainer, back, titlebar, rightClick)
                } catch (e) {
                    error(e)
                }
            } else {
                error(`Failed to create room: ${(await response.json()).data}`)
            }
        }))

        const data = await response.json()
        for (const room of data.data) {
            try {
                addRoom(<string>room.name, space, server, createRoom, instance, rooms, messages, messageContents, send, messagesContainer, back, titlebar, rightClick)
            } catch (e) {
                error(e)
            }
        }

        rooms.appendChild(createRoom)
    } else {
        error(`Failed to load rooms: ${(await response.json()).data}`)
    }
}


function removeRoom(room: string, button: HTMLButtonElement, rooms: HTMLDivElement, messagesContainer: HTMLDivElement, back: HTMLDivElement, titlebar: HTMLHeadingElement) {
    rooms.removeChild(button)
    if (room === currentRoom) {
        if (activeSocket) {
            activeSocket.close()
            activeSocket = null
        }
    }
    messagesContainer.classList.add("hidden")
    titlebar.classList.remove("mobile-hidden")
    back.classList.add("hidden")
}

function addRoom(room: string, space: Space, server: string, createRoom: HTMLButtonElement, instance: URL, rooms: HTMLDivElement, messages: HTMLDivElement, messageContents: HTMLInputElement, send: HTMLImageElement, messagesContainer: HTMLDivElement, back: HTMLDivElement, titlebar: HTMLHeadingElement, rightClick: ContextMenu) {
    const button = document.createElement("button")
    button.innerText = room
    button.addEventListener("click", lock(async () => {
        try {
            return openRoom(room, space, server, instance, messages, messageContents, send, messagesContainer, back, titlebar, rightClick)
        } catch (e) {
            error(e)
        }
    }))
    button.addEventListener("contextmenu", (e: PointerEvent) => {
        e.preventDefault()
        e.stopPropagation()
        unhideContextMenu(rightClick, [
            button.offsetLeft + 35,
            button.offsetTop + 25
        ], {
            delete: lock(async () => {
                if (await accept({
                    title: "Delete Room",
                    subtitle: "Are you sure you want to delete this room?"
                })) {
                    try {
                        const response = await performRequest(new URL("api/v1/rooms/delete", instance), {
                            name: room,
                            space: {
                                name: space.name,
                                server: {
                                    domain: server
                                }
                            }
                        })
                        if (response.status === 200) {
                            removeRoom(room, button, rooms, messagesContainer, back, titlebar)
                        } else {
                            error(`Failed to delete space: ${(await response.json()).data}`)
                        }
                    } catch (e) {
                        error(`Failed to delete space: ${e}`)
                    }
                }
            }),
        })
    })
    rooms.appendChild(button)
    rooms.appendChild(createRoom)
}

let activeSocket: WebSocket | null = null

async function listenToRoom(room: string, space: Space, server: string, instancePreclone: URL, messages: HTMLDivElement) {
    const instance = new URL(instancePreclone)
    instance.protocol = instance.protocol === "https:" ? "wss:" : "ws:"
    const socket = new WebSocket(new URL("api/v1/messages/listen", instance))
    socket.onopen = lock(async () => {
        status("Connected to room: " + room)
        socket.send(JSON.stringify(await newRequestBody({
            name: room,
            space: {
                name: space.name,
                server: {
                    domain: server
                }
            }
        })))
    })
    socket.onmessage = async (event) => {
        try {
            const data = JSON.parse(event.data)
            if (data.sender.username !== username) {
                const msg = new Message()
                msg.sender = data.sender.username
                msg.content = data.content
                msg.timestamp = new Date(0)
                addMessage(msg, messages)
                messages.scrollTo(0, messages.scrollHeight)
            }
        } catch (e) {
            error(e)
        }
    }
    socket.onerror = () => {
        status("Error when listening to room: " + room)
    }
    socket.onclose = () => {
        status("Disconnected from room: " + room)
    }
    activeSocket = socket
}

type PointerEventListener = (e: PointerEvent) => void
function deleteMessage(rightClick: ContextMenu, messageContainer: HTMLDivElement, instance: URL, messageData: Object, messages: HTMLDivElement): PointerEventListener {
    return (e: PointerEvent) => {
        e.preventDefault()
        e.stopPropagation()
        unhideContextMenu(rightClick, [
            messageContainer.offsetLeft + 35,
            messageContainer.offsetTop + 25
        ], {
            delete: lock(async () => {
                try {
                    const response = await performRequest(new URL("api/v1/messages/delete", instance), messageData)
                    if (response.status === 200) {
                        messages.removeChild(messageContainer)
                    } else {
                        error(`Failed to delete space: ${(await response.json()).data}`)
                    }
                } catch (e) {
                    error(`Failed to delete space: ${e}`)
                }
            })
        })
    }
}

async function openRoom(room: string, space: Space, server: string, instance: URL, messages: HTMLDivElement, messageContents: HTMLInputElement, send: HTMLImageElement, messagesContainer: HTMLDivElement, back: HTMLDivElement, titlebar: HTMLHeadingElement, rightClick: ContextMenu) {
    const noMessages = <HTMLSpanElement> messages.firstElementChild
    messages.querySelectorAll("div").forEach((message) => {
        message.remove()
    })
    messagesContainer.classList.remove("hidden")
    back.classList.remove("hidden")
    titlebar.classList.add("mobile-hidden")
    if (activeSocket) {
        activeSocket.close()
        activeSocket = null
    }
    const response = await performRequest(new URL("api/v1/messages/list", instance), {
        name: room,
        space: {
            name: space.name,
            server: {
                domain: server
            }
        }
    })
    if (response.status === 200) {
        const data = await response.json()
        if (data.data.length > 0) {
            noMessages.classList.add("hidden")
        } else {
            noMessages.classList.remove("hidden")
        }
        for (const messageData of data.data) {
            const msg = new Message()
            msg.sender = messageData["sender"]["username"]
            msg.content = messageData["content"]
            msg.timestamp = new Date(0)
            let messageContainer = addMessage(msg, messages)
            if (msg.sender === username) {
                messageContainer.addEventListener("contextmenu", deleteMessage(rightClick, messageContainer, instance, messageData, messages))
            }
        }
        currentRoom = room
    } else {
        error(`Failed to load messages: ${(await response.json()).data}`)
    }
    messages.scrollTo(0, messages.scrollHeight)
                const sendMessage = lock(async () => {
                const messageContent = messageContents.value
                if (messageContent.length === 0) {
                    return
                }
                let response
                try {
                    response = await performRequest(new URL("api/v1/messages/send", instance), {
                        room: {
                            name: currentRoom,
                            space: {
                                name: space.name,
                                server: {
                                    domain: server
                                }
                            },
                        },
                        content: messageContent
                    })
                } catch (e) {
                    error(e)
                }
                console.log("Processing response")
                if (response.status === 201) {
                    try {
                        const data = await response.json()
                        const msg = new Message()
                        msg.sender = localStorage.getItem("username")
                        msg.content = messageContent
                        msg.timestamp = new Date(0)
                        let messageContainer = addMessage(msg, messages)
                        messageContainer.addEventListener("contextmenu", deleteMessage(rightClick, messageContainer, instance, data.data, messages))
                        messageContents.value = ""
                        messages.scrollTo(0, messages.scrollHeight)
                    } catch (e) {
                        error(e)
                    }
                } else {
                    error(`Failed to send message: ${(await response.json()).data}`)
                }
            })
            send.addEventListener("click", sendMessage)
            messageContents.addEventListener("keyup", async (e) => {
                console.log("Key pressed: " + e.key)
                if (e.key === "Enter") {
                    console.log("Sending message on Enter key press")
                    return sendMessage()
                }
            })
    return listenToRoom(room, space, server, instance, messages)
}

class Message {
    sender: string
    content: string
    timestamp: Date
}

function addMessage(message: Message, messages: HTMLDivElement): HTMLDivElement {
    messages.firstElementChild.classList.add("hidden")
    const messageContainer = document.createElement("div")
    messageContainer.classList.add("message")
    const image = document.createElement("img")
    image.src = "https://placehold.co/512x512"
    image.alt = message.sender
    messageContainer.appendChild(image)
    const text = document.createElement("div")
    text.classList.add("text")
    const messageHeader = document.createElement("div")
    messageHeader.classList.add("message-header")
    const username = document.createElement("p")
    username.innerText = message.sender
    const timestamp = document.createElement("p")
    timestamp.innerText = message.timestamp.toLocaleString()
    messageHeader.appendChild(username)
    messageHeader.appendChild(timestamp)
    text.appendChild(messageHeader)
    const content = document.createElement("p")
    content.innerText = message.content
    text.appendChild(content)
    messageContainer.appendChild(text)
    messages.appendChild(messageContainer)
    return messageContainer
}

document.addEventListener("DOMContentLoaded", async () => {
    try {
        let theme = getTheme()
        themeSvgs()
        let instance: URL
        const server = localStorage.getItem("instance")
        const prefix = localStorage.getItem("prefix")
        if (server === null || prefix === null || localStorage.getItem("certificate") === null) {
            window.location.href = "/login"
        } else {
            try {
                instance = new URL(`${prefix}//${server}`)
                const certificate = JSON.parse(localStorage.getItem("certificate"))
                username = certificate["components"]["user"]["username"]
            } catch (e) {
                error(`Failed to load username: ${e}`)
            }
            const connectionStatusDot = <HTMLDivElement>document.getElementById("connection-status-dot")
            const connectionStatus = <HTMLParagraphElement>document.getElementById("connection-status")
            const messageContents = <HTMLInputElement>document.getElementById("message")
            const send = <HTMLImageElement>document.getElementById("send")
            const messages = <HTMLDivElement>document.getElementById("messages")
            const rooms = <HTMLDivElement>document.getElementById("rooms")
            const messagesContainer = <HTMLDivElement>document.getElementById("messages-container")
            const spaces = <HTMLDivElement>document.getElementById("spaces")
            const settings = <HTMLImageElement>document.getElementById("settings")
            const createSpace = <HTMLObjectElement>document.getElementById("new")
            const titlebar = <HTMLHeadingElement>document.getElementById("titlebar")
            const back = <HTMLDivElement>document.getElementById("back")
            const tooltip = <Tooltip>document.getElementById("tooltip")
            tooltip.spaceName = <HTMLParagraphElement>document.getElementById("space-name")
            const rightClick = <ContextMenu>document.getElementById("rightclick")
            rightClick.invite = <HTMLButtonElement>document.getElementById("invite")
            rightClick.leave = <HTMLButtonElement>document.getElementById("leave")
            rightClick.delete = <HTMLButtonElement>document.getElementById("delete")

            const greeting = document.createElement("p")

            settings.addEventListener("click", lock(async () => {
                await choice({
                    title: "Settings",
                    subtitle: greeting
                }, [
                    "Change theme",
                    "Logout",
                    "Delete Account",
                    "Close"
                ], lock(async (index: number, close: Close) => {
                    switch (index) {
                        case 0:
                            await choice({
                                title: "Change Theme",
                                subtitle: "Select your preferred theme"
                            }, [
                                "Latte",
                                "Mocha",
                                "Frappe",
                                "Macchiato",
                                "Confirm"
                            ], (index: number, close: Close) => {
                                switch (index) {
                                    case 0:
                                        setTheme("latte", theme)
                                        themeSvgs()
                                        theme = "latte"
                                        break
                                    case 1:
                                        setTheme("mocha", theme)
                                        themeSvgs()
                                        theme = "mocha"
                                        break
                                    case 2:
                                        setTheme("frappe", theme)
                                        themeSvgs()
                                        theme = "frappe"
                                        break
                                    case 3:
                                        setTheme("macchiato", theme)
                                        themeSvgs()
                                        theme = "macchiato"
                                        break
                                    case 4:
                                        close()
                                        break
                                }
                            })
                            break
                        case 1:
                            try {
                                localStorage.removeItem("username")
                                localStorage.removeItem("key")
                                localStorage.removeItem("certificate")
                                localStorage.removeItem("instance")
                                window.location.href = "/login"
                            } catch (e) {
                                error(e)
                            }
                            break
                        case 2:
                            try {
                                if (await accept({
                                    title: "Delete Account",
                                    subtitle: "Are you sure you want to delete your account?"
                                })) {
                                    const response = await performRequest(new URL("api/v1/users/delete", instance), 0)
                                    if (response.status === 200) {
                                        localStorage.removeItem("username")
                                        localStorage.removeItem("key")
                                        localStorage.removeItem("certificate")
                                        localStorage.removeItem("instance")
                                        window.location.href = "/login"
                                    } else {
                                        error(`Failed to delete account: ${(await response.json()).data}`)
                                    }
                                }
                            } catch (e) {
                                error(e)
                            }
                            break
                        case 3:
                            close()
                    }
                }))
            }))
            back.addEventListener("click", () => {
                back.classList.add("hidden")
                titlebar.classList.remove("mobile-hidden")
                messagesContainer.classList.add("hidden")
            })
            greeting.innerText = `Welcome, ${username}!`
            createSpace.addEventListener("click", lock(async () => {
                const index: number = await choice({
                    title: "Add a space",
                    subtitle: "Join or create a space"
                }, [
                    "Join existing space",
                    "Create new space",
                    "Close"
                ])
                switch (index) {
                    case 0:
                        try {
                            const response = await performRequest(
                                new URL("api/v1/spaces/join", instance),
                                Base64UrlToArray(
                                    await ask({
                                        title: "Join room"
                                    }, "Invite link")
                                )
                            )
                            if (response.status === 200) {
                                const data = await response.json()
                                const space = new Space()
                                space.name = data.data.space.name
                                space.image = data.data.image
                                addSpace(space, instance, server, spaces, tooltip, rooms, messages, messageContents, send, messagesContainer, back, titlebar, rightClick)
                            } else {
                                error(`Failed to join space: ${(await response.json()).error}`)
                            }
                        } catch(e) {
                            error(`Failed to join space: ${e}`)
                        }
                        break
                    case 1:
                        const space = new Space()
                        space.name = await ask({
                            title: "Create Space"
                        }, "Space name")
                            try {
                            space.image = URL.parse(await ask({
                                title: "Create Space"
                            }, "Link to space image", "url"))
                        } catch(e) {
                            error(`Invalid image link: ${e}`)
                        }
                        try {
                            const response = await performRequest(new URL("api/v1/spaces/create", instance), {
                                space: {
                                    name: space.name,
                                    server: {
                                        domain: server
                                    }
                                },
                                members: [
                                    {
                                        username: username,
                                        server: {
                                            domain: server
                                        }
                                    }
                                ],
                                rooms: [],
                                image: space.image
                            })
                            if (response.status === 201) {
                                addSpace(space, instance, server, spaces, tooltip, rooms, messages, messageContents, send, messagesContainer, back, titlebar, rightClick)
                            } else {
                                error(`Failed to create space: ${(await response.json()).error}`)
                            }
                        } catch (e) {
                            error(`Failed to create space: ${e}`)
                        }
                        break
                    }
            }))
            // run a connectivity test on the instance
            // we will use this to change the color of the connection status dot
            let response
            try {
                response = await fetch(new URL("api/v1/server/ping", instance))
                if (response.status === 200) {
                    connectionStatusDot.classList.remove("red")
                    connectionStatusDot.classList.add("green")
                    connectionStatus.innerText = "Connected"
                } else {
                    connectionStatusDot.classList.remove("green")
                    connectionStatusDot.classList.add("red")
                    connectionStatus.innerText = `Failed to connect (${response.status})`
                }
            } catch (e) {
                connectionStatusDot.classList.remove("green")
                connectionStatusDot.classList.add("red")
                connectionStatus.innerText = `Failed to connect (${e})`
            }
            loadSpaces(instance, server, spaces, tooltip, rooms, messages, messageContents, send, messagesContainer, back, titlebar, rightClick)
        }
    } catch (e) {
        error(e)
    }
})