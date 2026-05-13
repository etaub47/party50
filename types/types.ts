export interface ActiveMission {
    challengeId: string,
    teamId: string,
    status: string,
    currentStep: number
}

export interface Option {
    id: string,
    label: string,
    event_id?: string,
    item_id?: string
}

export interface MissionStep {
    order: number,
    type: string,
    config: {
        solution?: string,
        failure_event_id?: string,
        instruction?: string,
        voting?: string,
        hints?: string[],
        options?: Option[],
        puzzle?: number,
        baseHue?: number,
        label?: string
    }
}

export interface Mission {
    id: string,
    title: string,
    description: string,
    requirements: {
        min_players: number,
        required_item_id?: string
    },
    steps: MissionStep[]
}
