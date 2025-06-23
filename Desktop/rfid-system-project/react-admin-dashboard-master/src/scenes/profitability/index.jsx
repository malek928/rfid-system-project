import { Box } from "@mui/material";
import Header from "../../components/Header";
import LineChart from "../../components/LineChart";

const Profitability = () => {
  return (
    <Box m="20px">
      <Header title="Profitability Chart" subtitle="Simple Profitability Chart" />
      <Box height="75vh">
        <LineChart />
      </Box>
    </Box>
  );
};

export default Profitability;
