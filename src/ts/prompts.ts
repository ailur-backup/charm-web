export type BaseDiv = HTMLDivElement & {
    inputContainer: HTMLDivElement
    heading: RenderedContent | HTMLElement
}

export class RenderedContent {
    title: HTMLHeadingElement
    subtitle?: HTMLParagraphElement
}

export interface Content {
    title: string | HTMLHeadingElement
    subtitle?: string | HTMLParagraphElement
}

export function createBaseDiv(message: Content | HTMLElement): BaseDiv {
    const container = document.createElement("div") as BaseDiv
    container.classList.add("prompt-backdrop")

    const mainDiv = document.createElement("div")
    mainDiv.classList.add("prompt-container")
    container.appendChild(mainDiv)

    if (message instanceof HTMLElement) {
        mainDiv.appendChild(message)
        container.heading = message
    } else {
        let title: HTMLHeadingElement
        if (message.title instanceof HTMLHeadingElement) {
            title = message.title
        } else {
            title = document.createElement("h1")
            title.innerText = message.title
        }

        title.classList.add("prompt-title")
        mainDiv.appendChild(title)
        container.heading = new RenderedContent()
        container.heading.title = title

        if (message.subtitle) {
            let subtitle: HTMLParagraphElement
            if (message.subtitle instanceof HTMLParagraphElement) {
                subtitle = message.subtitle
            } else {
                subtitle = document.createElement("p")
                subtitle.innerText = message.subtitle
            }
            subtitle.classList.add("prompt-subtitle")
            mainDiv.appendChild(subtitle)
            container.heading.subtitle = subtitle
        } else {
            title.style.marginBottom = "25px"
        }
    }

    const inputContainer = document.createElement("div")
    inputContainer.classList.add("prompt-input-container")
    mainDiv.appendChild(inputContainer)
    container.inputContainer = inputContainer

    return container
}

export function createButton(text: string, callback: EventListener): HTMLButtonElement {
    const button = document.createElement("button")
    button.classList.add("prompt-button")
    button.textContent = text
    button.addEventListener("click", callback)
    return button
}

export async function message(message: Content | HTMLElement): Promise<void> {
    return new Promise((resolve) => {
        const container = createBaseDiv(message)
        const button = createButton("Ok", () => {
            document.body.removeChild(container)
            resolve()
        })

        container.inputContainer.appendChild(button)
        document.body.appendChild(container)
    })
}

export async function accept(message: Content | HTMLElement): Promise<boolean> {
    return new Promise((resolve) => {
        const container = createBaseDiv(message)

        const yes = createButton("Yes", () => {
            resolve(true)
            document.body.removeChild(container)
        })
        container.inputContainer.appendChild(yes)

        const no = createButton("No", () => {
            resolve(false)
            document.body.removeChild(container)
        })

        container.inputContainer.appendChild(no)
        document.body.appendChild(container)
    })
}

export async function ask(message: Content | HTMLElement, placeholder?: string, type?: string): Promise<string> {
    return new Promise((resolve) => {
        const container = createBaseDiv(message)
        const input = document.createElement("input")
        if (placeholder) input.placeholder = placeholder
        if (type) input.type = type
        input.classList.add("prompt-input")
        input.type = "text"
        container.inputContainer.appendChild(input)

        const button = createButton("Ok", () => {
            document.body.removeChild(container)
            resolve(input.value)
        })

        container.inputContainer.appendChild(button)
        document.body.appendChild(container)
    })
}

export async function date(message: Content | HTMLElement, type?: string): Promise<Date> {
    return new Promise((resolve) => {
        const container = createBaseDiv(message)
        const input = document.createElement("input")
        if (type) input.type = type
        input.classList.add("prompt-input")
        input.type = "datetime-local"
        container.inputContainer.appendChild(input)

        const button = createButton("Ok", () => {
            document.body.removeChild(container)
            resolve(new Date(input.value))
        })

        container.inputContainer.appendChild(button)
        document.body.appendChild(container)
    })
}

export async function upload(message: Content | HTMLElement, multiple: boolean): Promise<FileList> {
    return new Promise((resolve) => {
        const container = createBaseDiv(message)
        const input = document.createElement("input")
        input.style.display = "none"
        input.type = "file"
        input.multiple = multiple
        input.onchange = () => {
            resolve(input.files)
            document.body.removeChild(container)
        }

        const button = createButton("Upload", () => {
            input.click()
        })

        const cancelButton = createButton("Cancel", () => {
            document.body.removeChild(container)
            resolve(new FileList())
        })

        container.inputContainer.appendChild(button)
        container.inputContainer.appendChild(cancelButton)
        container.inputContainer.appendChild(input)
        document.body.appendChild(container)
    })
}

export type Close = () => void
export type OnChoice = (index: number, close: Close) => void

export async function choice(message: Content | HTMLElement, choices: string[], onchoice?: OnChoice): Promise<number | null> {
    return new Promise((resolve) => {
        const container = createBaseDiv(message)

        const close = () => {
            document.body.removeChild(container)
            resolve(null)
        }

        choices.forEach((choice) => {
            const button = createButton(choice, () => {
                if (onchoice) {
                    onchoice(choices.indexOf(choice), close)
                } else {
                    resolve(choices.indexOf(choice))
                    document.body.removeChild(container)
                }
            })
            container.inputContainer.appendChild(button)
        })

        document.body.appendChild(container)
    })
}
