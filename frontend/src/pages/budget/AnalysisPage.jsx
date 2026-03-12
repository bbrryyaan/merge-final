//$$$$$$
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
} from "chart.js";
import { Pie } from "react-chartjs-2";
import "./AnalysisPage.css";

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale);

// Mock data similar to what the original index.html would generate
const mockExpenseData = {
  Shopping: 150,
  "Food & Dining": 250,
  Entertainment: 80,
  Healthcare: 50,
  Subscriptions: 30,
  General: 120,
};

const labels = Object.keys(mockExpenseData);
const dataValues = Object.values(mockExpenseData);
const totalExpenses = dataValues.reduce((sum, val) => sum + val, 0);

const chartData = {
  labels: labels,
  datasets: [
    {
      data: dataValues,
      backgroundColor: [
        "#ff453a",
        "#32ade6",
        "#ffcc00",
        "#af52de",
        "#30d158",
        "#ff9f0a",
        "#8e8e93",
        "#5e5ce6",
      ],
      borderColor: "#0f172a",
      borderWidth: 2,
    },
  ],
};

const chartOptions = {
  plugins: {
    legend: {
      display: false, // We are creating a custom legend
    },
  },
  cutout: "50%",
};

const AnalysisPage = () => {
  return (
    <div id="analysis-page-container">
      <div className="page-header">
        <h2>Expense Analysis</h2>
      </div>

      {totalExpenses > 0 ? (
        <>
          <div id="chart-container">
            <Pie data={chartData} options={chartOptions} />
          </div>
          <div id="legend-container">
            {labels.map((label, index) => (
              <div className="legend-item" key={label}>
                <div
                  className="legend-color-box"
                  style={{ backgroundColor: chartData.datasets[0].backgroundColor[index] }}
                ></div>
                <span>
                  {label} (
                  {((mockExpenseData[label] / totalExpenses) * 100).toFixed(1)}
                  %)
                </span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="placeholder-card">
          <p>No expense data available for this month to generate a chart.</p>
        </div>
      )}
    </div>
  );
};

export default AnalysisPage;
