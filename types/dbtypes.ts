export interface Item {
    id?: string,
    name: string,
    type?: string,
    intel?: number,
    heat?: number
}

export interface PlayerAttempt {
    player_id?: string,
    challenge_id?: string,
    attempts_used: number
}

export interface PlayerChallenge {
    player_id?: string,
    challenge_id?: string,
    team_id?: string,
    status: 'WAITING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED',
    current_step: number
}

export interface PlayerItem {
    player_id?: string,
    item_id?: string,
    item?: Item
}

export interface PlayerStats {
    id: string,
    name: string,
    role: string,
    total_intel: number,
    max_intel: number,
    total_heat: number,
    current_credits: number,
    max_credits: number
}

export interface PlayerVote {
    id?: string,
    challenge_id?: string,
    team_id?: string,
    player_id: string,
    step?: number,
    option_id: string
}
