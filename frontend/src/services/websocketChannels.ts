export const websocketChannels = {
    courseChat: (course: string) => `course:${course.trim()}:chat`,
    courseGameLobby: (course: string, lobbyId: string) =>
        `course:${course.trim()}:game:${lobbyId.trim()}`,
    presentationGameRoom: (roomId: string) => `presentation-game:${roomId.trim()}`,
};
