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
    teamA: string;
    teamB: string;
    teamA_ID: number | null;
    teamB_ID: number | null;
    winner: string | null;
    winnerId: number | null;
    nextBattleId: number | null;
    parentMatchIds?: number[];
    Yposition: number;
    Xposition: number;
}

export const Tournament: React.FC<TournamentProps> = ({ bracket, setStep }) => {
    const X_OFFSET = 150;
    const Y_OFFSET = 180;
    const ROUND_WIDTH = 200;
    const SCALE_FACTOR = 1.2;
    const [selectedMatch, setSelectedMatch] = useState<Battle | null>(null);
    const [prompt1Response, setPrompt1Response] = useState("");
    const [prompt2Response, setPrompt2Response] = useState("");
    const [myBracket, setBracket] = useState<Battle[]>([...bracket]);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const handleMatchClick = async (match: Battle) => {
        try {
            const response = await fetch(`http://localhost:5000/get_battle?battle_id=${match.id}`);
            if (!response.ok) throw new Error("Failed to retrieve battle");
            const data = await response.json();
            setPrompt1Response(data.prompt1Response || "");
            setPrompt2Response(data.prompt2Response || "");
        } catch (error) {
            console.error(error);
        }
        setSelectedMatch(match);
    };;

    const handleSelectWinner = async (winner: string, winnerId: number | null) => {

        const updatedBracket = myBracket.map((match) =>
            match.id === selectedMatch?.id ? { ...match, winner } : match
        );

        try {
            await fetch("http://localhost:5000/update_battle_winner", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ battle_id: selectedMatch?.id, winner_prompt_id: winnerId }),
            });
        } catch (error) {
            console.error(error);
        }

        // Auto-fill next round on frontend
        const nextMatch = myBracket.find((m) => m.id === selectedMatch?.nextBattleId);
        if (nextMatch && selectedMatch) {
            const selectedIndex = updatedBracket.findIndex(
                (m) => m.id === selectedMatch.id
            );
            const nextIndex = updatedBracket.findIndex(
                (m) => m.id === nextMatch.id
            );

            updatedBracket[nextIndex] = {
                ...nextMatch,
                teamA: selectedIndex % 2 === 0 ? winner : nextMatch.teamA,
                teamA_ID: selectedIndex % 2 === 0 ? winnerId : nextMatch.teamA_ID,
                teamB: selectedIndex % 2 === 1 ? winner : nextMatch.teamB,
                teamB_ID: selectedIndex % 2 === 1 ? winnerId : nextMatch.teamB_ID,
            };
        }

        setBracket(updatedBracket);
        setSelectedMatch(null);
    };

    const TOTAL_HEIGHT = (myBracket.length / 2) * Y_OFFSET

    // Draw the bracket lines for the tournament
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

        // Draw connecting lines for each match that leads to a next match
        myBracket.forEach(match => {
            if (match.nextBattleId) {
                const nextMatch = myBracket.find(m => m.id === match.nextBattleId);
                if (nextMatch) {
                    // Calculate approximate center positions; adjust offsets as needed
                    const startX = (match.Xposition + X_OFFSET) * SCALE_FACTOR;
                    const startY = match.Yposition + Y_OFFSET; // 
                    const endX = (nextMatch.Xposition + X_OFFSET) * SCALE_FACTOR;
                    const endY = nextMatch.Yposition + Y_OFFSET;
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
                    {[...new Set(myBracket.map((match) => match.round))].map((round) => {
                        const roundStyle = {
                            height: `${TOTAL_HEIGHT}px`,
                            left: `${(round - 1) * ROUND_WIDTH}px`,
                        };
                        return (
                            <div key={round} className="round" style={roundStyle}>
                                {myBracket
                                    .filter((match) => match.round === round)
                                    .map((match) => {
                                        const containerStyle = {
                                            top: `${match.Yposition + X_OFFSET}px`, // Adjust as needed
                                            transform: "translateY(-60%)"
                                        };
                                        return (
                                            <div key={match.id}>
                                                <div
                                                    key={match.id}
                                                    className={`match-container ${match.nextBattleId ? "with-line" : ""}`}
                                                    style={containerStyle}
                                                >
                                                    <div className="match" onClick={() => handleMatchClick(match)}>
                                                        <Tooltip title={match?.teamA?.length > 10 ? match.teamA : ""} disableHoverListener={match?.teamA?.length <= 10}>
                                                            <div className={`team ${match.winner === match.teamA ? "winner" : ""}`}>
                                                                {match?.teamA?.length > 10 ? match.teamA.substring(0, 10) + "..." : match.teamA}
                                                            </div>
                                                        </Tooltip>
                                                        <div className="vs">vs</div>
                                                        <Tooltip title={match?.teamB?.length > 10 ? match.teamB : ""} disableHoverListener={match?.teamB?.length <= 10}>
                                                            <div className={`team ${match.winner === match.teamB ? "winner" : ""}`}>
                                                                {match?.teamB?.length > 10 ? match.teamB.substring(0, 10) + "..." : match.teamB}
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
                    isOpen={!!selectedMatch}
                    onRequestClose={() => setSelectedMatch(null)}
                    style={{ overlay: { zIndex: 3 } }}
                >
                    {selectedMatch && (
                        <>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <h2>Select Winner</h2>
                                <Button onClick={() => setSelectedMatch(null)}>
                                    Cancel
                                </Button>
                            </div>
                            <div style={{ display: "flex", gap: "20px" }}>
                                <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "50%" }}>
                                    <Button color="warning" disabled={!selectedMatch.teamA} onClick={() => handleSelectWinner(selectedMatch.teamA, selectedMatch?.teamA_ID)}>
                                        {selectedMatch.teamA ? selectedMatch.teamA : "Bye"}
                                    </Button>
                                    <TextField
                                        fullWidth
                                        multiline
                                        rows={20}
                                        label={`${selectedMatch?.teamA}`}
                                        variant="outlined"
                                        value={prompt1Response}
                                        onChange={() => { }}
                                    />
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "50%" }}>
                                    <Button disabled={!selectedMatch.teamB} color="secondary" onClick={() => handleSelectWinner(selectedMatch.teamB, selectedMatch?.teamB_ID)}>
                                        {selectedMatch.teamB ?  selectedMatch.teamB : "Bye" }   
                                    </Button>
                                    <TextField
                                        fullWidth
                                        multiline
                                        rows={20}
                                        label={`${selectedMatch?.teamB}`}
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
