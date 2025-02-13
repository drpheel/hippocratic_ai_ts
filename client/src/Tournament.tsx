import { TextField, Button, Tooltip } from "@mui/material";
import React, { useEffect, useRef, useState } from "react";
import Modal from "react-modal";

interface TournamentProps {
    bracket: Battle[];
    setStep: (step: number) => void;
}

export interface Battle {
    id: number;
    round: number;
    prompt1: string;
    prompt2: string;
    prompt1ID: number | null;
    prompt2ID: number | null;
    winner: string | null;
    winnerId: number | null;
    nextBattleId: number | null;
    yPosition: number;
    xPosition: number;
}

export const Tournament: React.FC<TournamentProps> = ({ bracket, setStep }) => {
    const X_OFFSET = 150;
    const Y_OFFSET = 180;
    const ROUND_WIDTH = 200;
    const SCALE_FACTOR = 1.2;
    const [selectedBattle, setSelectedBattle] = useState<Battle | null>(null);
    const [prompt1Response, setPrompt1Response] = useState("");
    const [prompt2Response, setPrompt2Response] = useState("");
    const [myBracket, setBracket] = useState<Battle[]>([...bracket]);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const handleBattleClick = async (battle: Battle) => {
        try {
            const response = await fetch(`http://localhost:5000/get_battle?battle_id=${battle.id}`);
            if (!response.ok) throw new Error("Failed to retrieve battle");
            const data = await response.json();
            setPrompt1Response(data.prompt1Response || "");
            setPrompt2Response(data.prompt2Response || "");
        } catch (error) {
            console.error(error);
        }
        setSelectedBattle(battle);
    };;

    const handleSelectWinner = async (winner: string, winnerId: number | null) => {

        const updatedBracket = myBracket.map((battle) =>
            battle.id === selectedBattle?.id ? { ...battle, winner } : battle
        );

        try {
            await fetch("http://localhost:5000/update_battle_winner", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ battle_id: selectedBattle?.id, winner_prompt_id: winnerId }),
            });
        } catch (error) {
            console.error(error);
        }

        // Update next round on frontend
        const nextBattle = myBracket.find((m) => m.id === selectedBattle?.nextBattleId);
        if (nextBattle && selectedBattle) {
            const selectedIndex = updatedBracket.findIndex(
                (m) => m.id === selectedBattle.id
            );
            const nextIndex = updatedBracket.findIndex(
                (m) => m.id === nextBattle.id
            );

            updatedBracket[nextIndex] = {
                ...nextBattle,
                prompt1: selectedIndex % 2 === 0 ? winner : nextBattle.prompt1,
                prompt1ID: selectedIndex % 2 === 0 ? winnerId : nextBattle.prompt1ID,
                prompt2: selectedIndex % 2 === 1 ? winner : nextBattle.prompt2,
                prompt2ID: selectedIndex % 2 === 1 ? winnerId : nextBattle.prompt2ID,
            };
        }

        setBracket(updatedBracket);
        setSelectedBattle(null);
    };

    const TOTAL_HEIGHT = (myBracket.length / 2) * Y_OFFSET

    // Draw the bracket lines for the tournament, using a canvas
    useEffect(() => {
        if (!canvasRef.current) return;

        const canvas = canvasRef.current;
        const canvasContext = canvas.getContext("2d");

        // Set canvas z-index so it renders under the bracket elements
        canvas.style.zIndex = "-1";

        // Make sure the canvas covers the entire bracket container
        if (myBracket.length > 0) {
            canvas.width = (myBracket[myBracket.length - 1].round * ROUND_WIDTH) + ROUND_WIDTH
        } else {
            canvas.width = 0
        }
        canvas.height = (myBracket.length / 2) * ROUND_WIDTH;


        // Clear any previous drawing
        if (canvasContext) {
            canvasContext.clearRect(0, 0, canvas.width, canvas.height);
        }

        // Draw connecting lines for each battle that leads to a next battle
        myBracket.forEach(battle => {
            if (battle.nextBattleId) {
                const nextBattle = myBracket.find(m => m.id === battle.nextBattleId);
                if (nextBattle) {
                    // Calculate approximate center positions; adjust offsets as needed
                    const startX = (battle.xPosition + X_OFFSET) * SCALE_FACTOR;
                    const startY = battle.yPosition + Y_OFFSET; // 
                    const endX = (nextBattle.xPosition + X_OFFSET) * SCALE_FACTOR;
                    const endY = nextBattle.yPosition + Y_OFFSET;
                    if (canvasContext) {
                        canvasContext.beginPath();
                        canvasContext.moveTo(startX, startY);
                        canvasContext.lineTo(endX, endY);
                        canvasContext.strokeStyle = "black";
                        canvasContext.lineWidth = 2;
                        canvasContext.stroke();
                    }
                }
            }
        });
    }, [myBracket]);

    return (
        <>
            <div className="tournament-container">
                <Button
                    style={{ marginLeft: "20px", zIndex: 2 }}
                    onClick={() => setStep(1)}

                >
                    Back
                </Button>
                <h1
                    className="tournament-title"
                >
                    Tournament Bracket
                </h1>
            </div>
            <div className="bracket-container">
                <div className="bracket" style={{ position: "relative" }}>
                    {[...new Set(myBracket.map((battle) => battle.round))].map((round) => {
                        const roundStyle = {
                            height: `${TOTAL_HEIGHT}px`,
                            left: `${(round - 1) * ROUND_WIDTH}px`,
                        };
                        return (
                            <div key={round} className="round" style={roundStyle}>
                                {myBracket
                                    .filter((battle) => battle.round === round)
                                    .map((battle) => {
                                        const containerStyle = {
                                            top: `${battle.yPosition + X_OFFSET}px`, // Adjust as needed
                                            transform: "translateY(-60%)"
                                        };
                                        return (
                                            <div key={battle.id}>
                                                <div
                                                    key={battle.id}
                                                    className={`battle-container ${battle.nextBattleId ? "with-line" : ""}`}
                                                    style={containerStyle}
                                                >
                                                    <div className="battle" onClick={() => handleBattleClick(battle)}>
                                                        <Tooltip title={battle?.prompt1?.length > 10 ? battle.prompt1 : ""} disableHoverListener={battle?.prompt1?.length <= 10}>
                                                            <div className={`team ${battle.winner === battle.prompt1 ? "winner" : ""}`}>
                                                                {battle?.prompt1?.length > 10 ? battle.prompt1.substring(0, 10) + "..." : battle.prompt1}
                                                            </div>
                                                        </Tooltip>
                                                        <div className="vs">vs</div>
                                                        <Tooltip title={battle?.prompt2?.length > 10 ? battle.prompt2 : ""} disableHoverListener={battle?.prompt2?.length <= 10}>
                                                            <div className={`team ${battle.winner === battle.prompt2 ? "winner" : ""}`}>
                                                                {battle?.prompt2?.length > 10 ? battle.prompt2.substring(0, 10) + "..." : battle.prompt2}
                                                            </div>
                                                        </Tooltip>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                        );
                    })}
                </div>
                <Modal
                    isOpen={!!selectedBattle}
                    onRequestClose={() => setSelectedBattle(null)}
                    style={{ overlay: { zIndex: 3 } }}
                >
                    {selectedBattle && (
                        <>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <h2>Select Winner</h2>
                                <Button onClick={() => setSelectedBattle(null)}>
                                    Cancel
                                </Button>
                            </div>
                            <div style={{ display: "flex", gap: "20px" }}>
                                <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "50%" }}>
                                    <Button color="warning" disabled={!selectedBattle.prompt1} onClick={() => handleSelectWinner(selectedBattle.prompt1, selectedBattle?.prompt1ID)}>
                                        {selectedBattle.prompt1 ? selectedBattle.prompt1 : "Bye"}
                                    </Button>
                                    <TextField
                                        fullWidth
                                        multiline
                                        rows={20}
                                        label={`${selectedBattle?.prompt1}`}
                                        variant="outlined"
                                        value={prompt1Response}
                                        onChange={() => { }}
                                    />
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "50%" }}>
                                    <Button disabled={!selectedBattle.prompt2} color="secondary" onClick={() => handleSelectWinner(selectedBattle.prompt2, selectedBattle?.prompt2ID)}>
                                        {selectedBattle.prompt2 ?  selectedBattle.prompt2 : "Bye" }   
                                    </Button>
                                    <TextField
                                        fullWidth
                                        multiline
                                        rows={20}
                                        label={`${selectedBattle?.prompt2}`}
                                        variant="outlined"
                                        value={prompt2Response}
                                        onChange={() => { }}
                                    />
                                </div>
                            </div>
                        </>
                    )}
                </Modal>
            </div>
            <canvas
                ref={canvasRef}
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    pointerEvents: "none"
                }}
            />
        </>
    );
};
