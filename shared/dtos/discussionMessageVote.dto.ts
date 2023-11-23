export interface discussionMessageVoteDTO {
    messageId: number;
    votes: number;
    userVoteStatus: number;
}

export interface discussionMessageVoteCreationDTO {
    messageId: number;
    userId: number;
    voteStatus: number;
}
