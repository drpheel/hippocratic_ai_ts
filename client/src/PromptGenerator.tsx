import React from "react";
import { TextField, Box, Button, Typography, Tooltip, CircularProgress } from "@mui/material";
import { Battle } from "./Tournament";

interface PromptGeneratorProps {
    onProceed: () => void;
    setBracket: React.Dispatch<React.SetStateAction<Battle[]>>;
    setShowGroups: React.Dispatch<React.SetStateAction<boolean>>;
}

interface Prompt {
    id: number;
    value: string;
    response: string;
}

export const PromptGenerator: React.FC<PromptGeneratorProps> = ({
    onProceed,
    setBracket,
    setShowGroups
}) => {

    const [question, setQuestion] = React.useState("");
    const [numPrompts, setNumPrompts] = React.useState(2);
    const [prompts, setPrompts] = React.useState<Prompt[]>([]);
    const [loading, setLoading] = React.useState(false);
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
            setPrompts(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    const handleSaveAndProceed = async () => {
        setLoading(true);
        try {
            const response = await fetch("http://localhost:5000/update_prompts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(prompts),
            });
            const data = await response.json();
            setBracket(data['battles']);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            onProceed();
        }
    };


    const handlePromptChange = (index: number, value: string) => {
        setPrompts((prev) => {
            const updated = [...prev];
            updated[index].value = value;
            return updated;
        });
    };

    return (
        <Box className="step1" sx={{ p: 2 }} ref={containerRef}>
            <h1>Enter Question</h1>
            <Typography
                variant="h6"
                onClick={() => setShowGroups(true)}
                className="clickable-text"
            >
                ...or view previous questions!
            </Typography>
            <Box mb={2} display="flex" alignItems="center" className="menu-box">
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
                                style={{ width: "340px", borderColor: 'primary.main' }}
                            />
                        </Box>
                    ))}
                    <Box>
                        <Button
                            color="info"
                            onClick={handleSaveAndProceed}
                            disabled={loading}
                        >
                            {loading ? <CircularProgress size={24} color="inherit" /> : "Save & Go to Tournament"}
                        </Button>
                    </Box>
                </Box>
            )}
        </Box>
    );
};