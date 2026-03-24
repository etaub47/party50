export interface Event {
    id?: string,
    description: string,
    type: string,
    intel: number,
    heat: number,
    credits: number
}

export interface Item {
    id?: string,
    name: string,
    type: string,
    cost: number,
    intel: number,
    heat: number,
    credits: number
}

export interface HistoryEvent {
    player_id: string,
    event_id: string,
    created_at: string,
    event: Event
}

export interface InventoryItem {
    player_id?: string,
    item_id?: string,
    created_at?: string,
    player?: Player,
    item?: Item
}

export interface Player {
    id?: string,
    name?: string,
    role?: string
}

export interface PlayerChallenge {
    player_id?: string,
    challenge_id?: string,
    team_id?: string,
    status: 'WAITING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED',
    current_step: number
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
