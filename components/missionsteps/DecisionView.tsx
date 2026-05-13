'use client'

import { processStepConsequences } from "@/app/actions/processConsequences";
import { PlayerVote } from "@/types/dbtypes";
import { Mission, MissionStep, Option } from "@/types/types";
import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";

const supabase = createClient()

export default function DecisionView({ missionData, currentStep, currentStepIndex, teamId, playerId,
                                       votes, onComplete
}: {
    missionData: Mission,
    currentStep: MissionStep,
    currentStepIndex: number,
    teamId: string,
    playerId: string,
    votes: PlayerVote[],
    onComplete: () => Promise<void>
}) {
    const [ isSubmitting, setIsSubmitting ] = useState<boolean>(false);
    const hasVoted = votes.some(v => v.player_id === playerId);

    // check to see if we have enough votes to advance
    // re-run whenever the parent sends new votes via Realtime
    useEffect(() => {
        const checkWin = async () => {
            const totalRequired = missionData.requirements.min_players;
            if (votes.length < totalRequired) return;

            const votingType = currentStep!.config.voting;
            let selectedOption: Option | undefined;

            if (votingType === 'majority') {
                const counts: Record<string, number> = {};
                votes.forEach(v => counts[v.option_id] = (counts[v.option_id] || 0) + 1);
                const winnerId = Object.entries(counts).find(([_, count]) =>
                    count > totalRequired / 2)?.[0];
                selectedOption = currentStep!.config.options!.find(o => o.id === winnerId);
            } else {
                const myVote = votes.find(v => v.player_id === playerId);
                selectedOption = currentStep!.config.options!.find(o => o.id === myVote?.option_id);
            }

            if (selectedOption) {
                await processStepConsequences({
                    playerId,
                    challengeId: missionData.id,
                    stepIndex: currentStepIndex,
                    eventId: selectedOption.event_id,
                    itemId: selectedOption.item_id
                });

                void onComplete();
            }
        };
        void checkWin();
    }, [votes, currentStep, currentStepIndex]);

    // handles the current player voting
    const handleVote = async (optionId: string) => {
        setIsSubmitting(true);
        const {error} = await supabase.from('player_vote').insert({
            team_id: teamId, player_id: playerId, challenge_id: missionData.id,
            step: currentStepIndex, option_id: optionId
        });
        if (error) {
            console.error(error);
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-4">

            <p className="text-white italic text-lg">{currentStep.config.instruction}</p>
            {(hasVoted || isSubmitting) ? (
                <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded text-center">
                    <p className="text-blue-400 animate-pulse">
                        {hasVoted
                            ? `Waiting for teammates (${votes.length}/${missionData.requirements.min_players})...`
                            : "Recording Vote..."
                        }
                    </p>
                </div>
            ) : (
                <div className="flex gap-2">
                    {currentStep.config.options?.map((opt: any) => (
                        <button
                            key={opt.id}
                            onClick={() => handleVote(opt.id)}
                            className="flex-1 bg-blue-900 hover:bg-blue-700 text-white py-2 rounded"
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            )}

            {/* warning labels */}
            {missionData.requirements.min_players > 1 && (
                <div className="p-4 bg-blue-900/30 border border-blue-500/50 rounded text-blue-200 text-sm italic">
                    <span className="text-red-500 font-bold block mb-1 uppercase text-xs">Note:</span>
                    {currentStep.config.voting === 'majority'
                        ? "Each team member must choose separately, but the MAJORITY vote will determine the outcome."
                        : "This decision is individual and will NOT impact the other members of your team."}
                </div>
            )}

        </div>
    );
}
