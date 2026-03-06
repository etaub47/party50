export interface PlayerStats {
    id: string;
    name: string;
    role: string;
    total_intel: number;
    max_intel: number;
    total_heat: number;
    current_credits: number;
    max_credits: number;
}

export interface Item {
    id?: string,
    name: string,
    type?: string,
    intel?: number,
    heat?: number
}

export interface PlayerItem {
    player_id?: string,
    item_id?: string,
    item: Item | null
}
