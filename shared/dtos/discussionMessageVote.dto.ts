export interface discussionMessageVoteDTO {
    messageId: number;
    votes: number;
    userVoteStatus: number;
}

export interface discussionMessageVoteCreationDTO {
    messageId: number;
    voteStatus: number;
}
