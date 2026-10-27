'use server'

import { Mission } from "@/types/types";
import { promises as fs } from 'fs'
import path from 'path'
import { readMission } from "@/utils/missionFile";

export async function listMissions(): Promise<{ id: string, title: string, description: string }[]> {
    const dir = path.join(process.cwd(), 'challenges');
    const files = await fs.readdir(dir);
    const missions = await Promise.all(
        files
            .filter(f => f.endsWith('.json'))
            .map(async f => {
                const content = await fs.readFile(path.join(dir, f), 'utf8');
                const { id, title, description } = JSON.parse(content);
                return { id, title, description };
            })
    );
    return missions.sort((a, b) => a.title.localeCompare(b.title));
}

// what the browser gets: keypad solutions are stripped, they're checked by submitKeypadCode
export async function getMissionManifest(challengeId: string):
    Promise<{data?: Mission, success: boolean, error?: string}> {
    try {
        const mission = await readMission(challengeId);
        for (const step of mission.steps)
            delete step.config.solution;
        return { success: true, data: mission };
    } catch (error) {
        console.error("FAILED TO LOAD MISSION:", error);
        return { success: false, error: "Mission file not found" };
    }
}
