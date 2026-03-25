'use server'

import { promises as fs } from 'fs'
import path from 'path'

export interface Option {
    id: string,
    label: string,
    event_id?: string,
    item_id?: string
}

export interface Mission {
    id: string,
    title: string,
    description: string,
    requirements: {
        min_players: number,
        required_item_id?: string
    },
    steps: [{
        order: number,
        type: string,
        config: {
            solution?: string,
            failure_event_id?: string,
            instruction?: string,
            voting?: string,
            hints?: string[],
            options?: Option[]
        }
    }]
}

export async function getMissionManifest(challengeId: string):
    Promise<{data?: Mission, success: boolean, error?: string}> {
    try {
        const filePath = path.join(process.cwd(), 'challenges', `${challengeId}.json`);
        const fileContent = await fs.readFile(filePath, 'utf8');
        return { success: true, data: JSON.parse(fileContent) as Mission };
    } catch (error) {
        console.error("FAILED TO LOAD MISSION:", error);
        return { success: false, error: "Mission file not found" };
    }
}
