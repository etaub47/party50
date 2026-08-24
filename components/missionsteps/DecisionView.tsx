'use client'

import { processStepConsequences } from "@/app/actions/processConsequences";
import { Item, PlayerVote } from "@/types/dbtypes";
import { Mission, MissionStep, Option } from "@/types/types";
import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";

const supabase = createClient()

export default function DecisionView({ missionData, currentStep, currentStepIndex, teamId, playerId,
                                       votes, hasAssetValidator, onComplete
}: {
    missionData: Mission,
    currentStep: MissionStep,
    currentStepIndex: number,
    teamId: string,
    playerId: string,
    votes: PlayerVote[],
    hasAssetValidator: boolean,
    onComplete: () => Promise<void>
}) {
    const [ isSubmitting, setIsSubmitting ] = useState<boolean>(false);
    const [ itemPreviews, setItemPreviews ] = useState<Record<string, Pick<Item, 'intel' | 'heat' | 'credits'>>>({});
    const hasVoted = votes.some(v => v.player_id === playerId);

    // Asset Validator: for a reward choice between items (never for a consequence-event
    // choice), fetch the exact intel/heat/credit yield of each option up front.
    useEffect(() => {
        setItemPreviews({});
        if (!hasAssetValidator)
            return;

        const itemOptions = (currentStep.config.options ?? []).filter(o => o.item_id);
        if (itemOptions.length === 0)
            return;

        void (async () => {
            const { data } = await supabase
                .from('item')
                .select('id, intel, heat, credits')
                .in('id', itemOptions.map(o => o.item_id));
            if (!data)
                return;
            const preview: Record<string, Pick<Item, 'intel' | 'heat' | 'credits'>> = {};
            itemOptions.forEach(o => {
                const row = data.find(d => d.id === o.item_id);
                if (row) preview[o.id] = row;
            });
            setItemPreviews(preview);
        })();
    }, [currentStepIndex, hasAssetValidator, currentStep]);

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
                    {currentStep.config.options?.map((opt: Option) => {
                        const preview = itemPreviews[opt.id];
                        return (
                            <button
                                key={opt.id}
                                onClick={() => handleVote(opt.id)}
                                className="flex-1 bg-blue-900 hover:bg-blue-700 text-white py-2 px-2 rounded flex flex-col items-center gap-1"
                            >
                                <span>{opt.label}</span>
                                {preview && (
                                    <span className="flex flex-wrap gap-1 justify-center">
                                        {preview.credits !== 0 && (
                                            <span className="bg-green-700 text-[10px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap">
                                                {preview.credits > 0 ? `+${preview.credits}` : preview.credits} CREDITS
                                            </span>
                                        )}
                                        {preview.intel !== 0 && (
                                            <span className="bg-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap">
                                                {preview.intel > 0 ? `+${preview.intel}` : preview.intel} INTEL
                                            </span>
                                        )}
                                        {preview.heat !== 0 && (
                                            <span className="bg-red-700 text-[10px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap">
                                                {preview.heat > 0 ? `+${preview.heat}` : preview.heat} HEAT
                                            </span>
                                        )}
                                    </span>
                                )}
                            </button>
                        );
                    })}
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
