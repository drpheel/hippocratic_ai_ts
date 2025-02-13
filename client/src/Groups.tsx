// TypeScript
import React from "react";
import { Battle } from "./Tournament";
import { Box, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";

interface Group {
    id: number;
    question: string;
    group_size: number;
}

interface GroupsProps {
    setBracket: React.Dispatch<React.SetStateAction<Battle[]>>;
    setShowGroups: React.Dispatch<React.SetStateAction<boolean>>;
    onProceed: () => void;
}

export const Groups: React.FC<GroupsProps> = ({ setBracket, setShowGroups, onProceed }) => {
    const [groups, setGroups] = React.useState<Group[]>([]);

    React.useEffect(() => {
        fetch("http://localhost:5000/list_groups")
            .then((res) => res.json())
            .then((data) => setGroups(data))
            .catch(console.error);
    }, []);

    const handleViewBattles = async (groupId: number) => {
        try {
            const res = await fetch(`http://localhost:5000/list_battles_by_group?prompt_group_id=${groupId}`);
            const data = await res.json();
            setBracket(data);
            onProceed();
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <Box className="step1" sx={{ p: 2 }}>
            <h1>Previous Questions</h1>
            <Typography
                variant="h6"
                onClick={() => setShowGroups(false)}
                className="clickable-text"
            >
                ...or enter a new question!
            </Typography>
            <Box className="menu-box">
                {groups.length > 0 && (
                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell style={{ minWidth: 100 }}>Question</TableCell>
                                    <TableCell></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {groups.map((g) => (
                                    <TableRow key={g.id}>
                                        <TableCell style={{ minWidth: 100 }}>{g.question}</TableCell>
                                        <TableCell>
                                            <button
                                                onClick={() => handleViewBattles(g.id)}
                                                style={{ fontFamily: "inherit" }}
                                            >
                                                <b>View Battles</b>
                                            </button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Box>
        </Box>
    );
};