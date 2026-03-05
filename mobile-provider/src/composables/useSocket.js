import { getSocket, initSocket } from '../utils/socket'

export function useSocket() {
    let socket = getSocket()

    if (!socket) {
        const token = localStorage.getItem('provider_token')
        if (token) {
            socket = initSocket(token)
        }
    }

    return {
        on: (event, callback) => {
            if (socket) socket.on(event, callback)
        },
        off: (event, callback) => {
            if (socket) socket.off(event, callback)
        },
        emit: (event, data) => {
            if (socket) socket.emit(event, data)
        },
        instance: socket
    }
}
