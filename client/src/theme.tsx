import { createTheme } from "@mui/material/styles";

const theme = createTheme({
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    fontFamily: "inherit",
                },
            },
        },
        MuiTextField: {
            styleOverrides: {
                root: {
                    fontFamily: "inherit",
                },
            },
        },
        MuiTableCell: {
            styleOverrides: {
                root: {
                    fontFamily: "inherit",
                },
            },
        },
    },
});

export default theme;