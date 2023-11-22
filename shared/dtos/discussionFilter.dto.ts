export interface discussionFilterDTO {
    conceptNodeId: number,
    contentNodeId: number,
    authorId: number,
    onlySolved: boolean,
    searchString: string
}

export interface discussionFilterContentNodeDTO {
    id: number,
    name: string,
    description: string,
}
