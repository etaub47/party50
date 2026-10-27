import { Mission } from "@/types/types";
import { promises as fs } from 'fs'
import path from 'path'

// The full mission file, keypad solutions included. Deliberately NOT in a
// 'use server' file: every export there is a server action the browser can
// call, and this must only ever be called from server code.
export async function readMission(challengeId: string): Promise<Mission> {
    const filePath = path.join(process.cwd(), 'challenges', `${challengeId}.json`);
    const fileContent = await fs.readFile(filePath, 'utf8');
    return JSON.parse(fileContent) as Mission;
}
