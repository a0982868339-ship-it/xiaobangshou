import { getSocket, initSocket } from '../utils/socket'
import { onUnmounted } from 'vue'

export function useSocket() {
    let socket = getSocket()

    if (!socket) {
        const token = localStorage.getItem('token')
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
        // 暴露原始 socket 实例以防需要
        instance: socket
    }
}
