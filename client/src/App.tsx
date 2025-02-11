import React, { useState, useEffect, useRef } from "react";
import Modal from "react-modal";
import './App.css'
import { TextField, Box, Button, Typography, Tooltip } from "@mui/material";


export interface Match {
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

function App() {
  Modal.setAppElement("#root");
  const [bracket, setBracket] = useState<Match[]>([]);
  let TOP_OFFSET = 150;
  interface TournamentProps {
    teams: string[];
  }

  const Tournament: React.FC<TournamentProps> = ({ teams }) => {
    const myRef = React.useRef(null);

    const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
    const [prompt1Response, setPrompt1Response] = useState("");
    const [prompt2Response, setPrompt2Response] = useState("");

    const handleMatchClick = async (match: Match) => {
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
      console.log(`Selected match: ${JSON.stringify(selectedMatch)}`);

      const updatedBracket = bracket.map((match) =>
        match.id === selectedMatch?.id ? { ...match, winner } : match
      );
      console.log(JSON.stringify(updatedBracket));

      try {
        await fetch("http://localhost:5000/update_battle_winner", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ battle_id: selectedMatch?.id, winner_prompt_id: winnerId }),
        });
      } catch (error) {
        console.error(error);
      }

      // Auto-fill next round
      const nextMatch = bracket.find((m) => m.id === selectedMatch?.nextBattleId);
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

    let totalHeight = (teams.length / 2) * 150

    // Add these lines inside your Tournament component (above the return) to create a ref for the canvas and draw on it:
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
      if (!canvasRef.current || !myRef.current) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      // Set canvas z-index so it renders under the bracket elements
      canvas.style.zIndex = "-1";

      // Make sure the canvas covers the entire bracket container
      if (bracket.length > 0) {
        canvas.width = (bracket[bracket.length - 1].round * 200) + 200
      } else {
        canvas.width = 0
      }
      canvas.height = (bracket.length / 2) * 200;


      // Clear any previous drawing
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }

      // Draw connecting lines for each match that leads to a next match
      bracket.forEach(match => {
        if (match.nextBattleId) {
          const nextMatch = bracket.find(m => m.id === match.nextBattleId);
          if (nextMatch) {
            // Calculate approximate center positions; adjust offsets as needed
            const startX = (match.Xposition + 150) * 1.2;
            const startY = match.Yposition + 180; // 150 equals TOP_OFFSET
            const endX = (nextMatch.Xposition + 150) * 1.2;
            const endY = nextMatch.Yposition + 180;
            if (ctx) {
              ctx.beginPath();
              ctx.moveTo(startX, startY);
              ctx.lineTo(endX, endY);
              ctx.strokeStyle = "black";
              ctx.lineWidth = 2;
              ctx.stroke();
            }
          }
        }
      });
    }, [bracket, myRef]);

    return (
      <>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            padding: "20px"
          }}
        >
          <button
            style={{ marginLeft: "20px", zIndex: 2 }}
            onClick={() => setStep(1)}

          >
            Back to Prompt Generation
          </button>
          <h1
            style={{
              flex: 1,
              textAlign: "center",
              width: "fit-content",
            }}
          >
            Tournament Bracket
          </h1>
        </div>
        <div className="bracket-container">
          <div className="bracket" ref={myRef} style={{ position: "relative" }}>
            {[...new Set(bracket.map((match) => match.round))].map((round) => {
              const roundStyle = {
                height: `${totalHeight}px`,
                left: `${(round - 1) * 200}px`,
              };
              return (
                <div key={round} className="round" style={roundStyle}>
                  {bracket
                    .filter((match) => match.round === round)
                    .map((match, index) => {
                      const containerStyle = {
                        top: `${match.Yposition + TOP_OFFSET}px`,
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
                              <div className={`team ${match.winner === match.teamA ? "winner" : ""}`}>
                                {match.teamA}
                              </div>
                              <div className="vs">vs</div>
                              <div className={`team ${match.winner === match.teamB ? "winner" : ""}`}>
                                {match.teamB}
                              </div>
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
              <h2>Select Winner</h2>
              <button onClick={() => handleSelectWinner(selectedMatch.teamA, selectedMatch?.teamA_ID)}>
                {selectedMatch.teamA}
              </button>
              <button onClick={() => handleSelectWinner(selectedMatch.teamB, selectedMatch?.teamB_ID)}>
                {selectedMatch.teamB}
              </button>
              <button onClick={() => setSelectedMatch(null)}>Cancel</button>
              <div style={{ marginTop: "20px" }}>
                <TextField
                fullWidth
                multiline
                rows={4}
                label={`${selectedMatch?.teamA} Response`}
                variant="outlined"
                value={prompt1Response}
                onChange={() => {}}
                style={{ marginBottom: "10px" }}
                />
                <TextField
                fullWidth
                multiline
                rows={4}
                label={`${selectedMatch?.teamB} Response`}
                variant="outlined"
                value={prompt2Response}
                onChange={() => {}}
                />
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

  const [step, setStep] = React.useState(1);


  const PromptGenerator: React.FC<{
    onProceed: () => void;
  }> = ({
    onProceed,
  }) => {

      const [question, setQuestion] = React.useState("");
      const [numPrompts, setNumPrompts] = React.useState(2);
      const [prompts, setPrompts] = React.useState<Array<{ id: number; value: string; response: string }>>([]);
      const [showScrollMessage, setShowScrollMessage] = React.useState(false);
      const containerRef = React.useRef<HTMLDivElement>(null);

      const handleGeneratePrompts = async () => {
        try {
          const response = await fetch("http://localhost:5000/create_group", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ question, size: numPrompts }),
          });
          if (!response.ok) throw new Error("Request failed");
          const data = await response.json();
          // data is the array of prompts from the server
          setPrompts(data);
        } catch (error) {
          console.error(error);
        }
      }

      const handleSaveAndProceed = async () => {
        try {
          const response =  await fetch("http://localhost:5000/update_prompts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(prompts),
          });
          const data = await response.json();
          setBracket(data['battles']);
        } catch (error) {
          console.error(error);
        }
        onProceed();
      };
      

      const handlePromptChange = (index: number, value: string) => {
        setPrompts((prev) => {
          const updated = [...prev];
          updated[index].value = value;
          return updated;
        });
      };
      
      useEffect(() => {
        const checkOverflow = () => {
          if (containerRef.current) {
            setShowScrollMessage(
              containerRef.current.scrollHeight > window.outerHeight
            );
          }
        };
        checkOverflow();
      }, [prompts.length]);

      useEffect(() => {
        const handleScroll = () => {
          if (containerRef.current) {
            const { scrollTop, clientHeight, scrollHeight } = containerRef.current;
            if (scrollTop + clientHeight >= scrollHeight) {
              setShowScrollMessage(false);
            }
          }
        };

        window.addEventListener("scroll", handleScroll);

        return () => {
          window.removeEventListener("scroll", handleScroll);
        };
      }, []);

      return (
        <Box className="step1" sx={{ p: 2 }} ref={containerRef}>
          <h1>Step 1: Enter Details</h1>
          <Box mb={2} display="flex" alignItems="center">
            <Typography style={{ marginRight: 10 }}> <h3> Question: </h3></Typography>
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Question"
              placeholder="Enter a question"
              variant="outlined"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
          </Box>
          <Box mb={2} display="flex" alignItems="center" justifyContent="space-between">
            <Typography style={{ marginRight: 10, textAlign: 'left' }}>
              <h3> Number of Prompts (2-32): </h3>
            </Typography>
            <TextField
              label="Number of Prompts (2-32)"
              type="number"
              value={numPrompts}
              onChange={(e) => {
                const value = parseInt(e.target.value, 10);
                setNumPrompts(value);
              }}
            />
          </Box>
          {(numPrompts < 2 || numPrompts > 32) && (
            <Typography color="error" style={{ marginLeft: 10 }}>
              Please enter a number between 2 and 32.
            </Typography>
          )}
          <Box mb={2}>
            <Tooltip title={question.trim() === "" ? "Enter a question to get started!" : "Click to Generate"}>
              <span>
                <Button
                  onClick={() => { handleGeneratePrompts(); }}
                  disabled={numPrompts < 2 || numPrompts > 32 || !numPrompts || (question.trim() === "")}
                >
                  Generate Prompts
                </Button>
              </span>
            </Tooltip>
          </Box>
          {showScrollMessage && (
                <div style={{ position: "fixed", bottom: 20, right: 20, color: "gray", textAlign: "center", background: "rgba(255, 255, 255, 0.8)", padding: "5px", borderRadius: "5px" }}>
                  Scroll to see more
                </div>
          )}
          {prompts.length > 0 && (
            <Box className="prompts">
              {prompts.map((prompt, index) => (
                <Box
                  key={index}
                  mb={2}
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <Typography variant="h6" color="primary">
                    Prompt {index + 1}
                  </Typography>
                  <TextField
                    multiline
                    rows={4}
                    variant="outlined"
                    value={prompt.value}
                    onChange={(e) => handlePromptChange(index, e.target.value)}
                    style={{ width: "360px", borderColor: 'primary.main' }}
                  />
                </Box>
              ))}
              <Box>
                <Button color="info" onClick={handleSaveAndProceed}>Save & Go to Tournament</Button>
              </Box>
            </Box>
          )}
        </Box>
      );
    };

  return (
    <div className="App">
      <div className="step-flow">
        {step === 1 ? (
          <PromptGenerator
            onProceed={() => setStep(2)}
          />
        ) : (
          // Step 2: Tournament bracket
          <Tournament teams={[
            "Team A", "Team B", "Team C", "Team D",
            "Team E", "Team F", "Team G", "Team H",
            "Team I", "Team J", "Team K", "Team L",
            "Team M", "Team N", "Team O", "Team P",
            /*"Team AA", "Team BA", "Team CA", "Team DA",
            "Team EA", "Team FA", "Team AG", "Team HA",
            "Team IA", "Team JA", "Team KA", "Team LA",*/
          ]} />
        )}
      </div>
    </div>
  )
}

export default App
