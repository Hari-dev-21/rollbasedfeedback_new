// src/pages/QuestionsAnalyze.tsx
import React, { useEffect, useState, useMemo, memo } from "react";
import { Bar, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  ChartData,
  ChartOptions,
} from "chart.js";
import api from "../services/api"; // Make sure this exists

// 1️⃣ ChartJS Registration
ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

// 2️⃣ Type Definitions
interface QuestionAnalyzeProps {
  formId: string;
}

interface QuestionAnalytics {
  question_id: number;
  question_text: string;
  question_type: string;
  response_count: number;
  answer_distribution: Record<string, number>;
  options: string[];
  responses?: string[];
  average_rating?: number;
}

// 3️⃣ Chart Colors
const CHART_COLORS = ["#3B82F6", "#F59E0B", "#10B981", "#EF4444", "#8B5CF6"];
interface ChartRendererProps {
  q: QuestionAnalytics;
}

// 4️⃣ Bar Chart Renderer
const BarChartRenderer = memo(({ q }: ChartRendererProps) => {
  const { labels, dataValues } = useMemo(() => {
    const labels = Object.keys(q.answer_distribution || {});
    const dataValues = Object.values(q.answer_distribution || {});
    return { labels, dataValues };
  }, [q.answer_distribution]);

  const data: ChartData<"bar"> = {
    labels,
    datasets: [
      {
        label: "Responses",
        data: dataValues as number[],
        backgroundColor: "#4F46E5",
      },
    ],
  };

  const options: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: true, text: q.question_text },
    },
    scales: { y: { beginAtZero: true } },
  };

  return (
    <div style={{ width: 350, height: 350 }}>
      <Bar data={data} options={options as any} />
      {q.average_rating !== undefined && (
        <p className="mt-2 text-sm text-gray-600">Average rating: {q.average_rating.toFixed(2)}</p>
      )}
    </div>
  );
});

// 5️⃣ Pie Chart Renderer
const PieChartRenderer = memo(({ q }: ChartRendererProps) => {
  const { labels, dataValues } = useMemo(() => {
    const labels = Object.keys(q.answer_distribution || {});
    const dataValues = Object.values(q.answer_distribution || {});
    return { labels, dataValues };
  }, [q.answer_distribution]);

  const data: ChartData<"pie"> = {
    labels,
    datasets: [
      {
        label: "Responses",
        data: dataValues as number[],
        backgroundColor: CHART_COLORS,
      },
    ],
  };

  const options: ChartOptions<"pie"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "bottom" },
      title: { display: true, text: q.question_text },
    },
  };

  return (
    <div style={{ width: 350, height: 350, margin: "0 auto" }}>
      <Pie data={data} options={options as any} />
    </div>
  );
});

// 6️⃣ Text Responses Renderer
const TextResponsesRenderer = memo(({ q }: ChartRendererProps) => {
  const responses = q.responses || [];

  return (
    <div className="p-4 border rounded-lg bg-gray-50">
      <h3 className="font-semibold mb-2">{q.question_text}</h3>
      <p className="text-gray-600 mb-2">
        {q.response_count} response{q.response_count !== 1 ? "s" : ""}
      </p>
      {responses.length > 0 ? (
        <ul className="list-disc pl-5 text-gray-700 space-y-1">
          {responses.map((text, index) => (
            <li key={index}>{text}</li>
          ))}
        </ul>
      ) : (
        <p className="italic text-gray-500">No responses available.</p>
      )}
    </div>
  );
});

// 7️⃣ Main Component
export default function QuestionsAnalyze({ formId }: QuestionAnalyzeProps) {
  const [questions, setQuestions] = useState<QuestionAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!formId) return;

    const fetchAnalytics = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await api.get(`/api/forms/${formId}/question_analytics/`);

        const dataArray = Array.isArray(res.data.results)
          ? res.data.results
          : res.data.results || Array.isArray(res.data)
          ? res.data
          : [];

        setQuestions(dataArray);
      } catch (err: any) {
        setError(err.response?.data?.detail || "Failed to load analytics");
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [formId]);

  const renderChart = (q: QuestionAnalytics) => {
    if (q.question_type === "rating" || q.question_type === "rating_10") return <BarChartRenderer q={q} />;
    if (["radio", "checkbox", "yes_no"].includes(q.question_type)) return <PieChartRenderer q={q} />;
    if (["text", "textarea", "email", "phone"].includes(q.question_type)) return <TextResponsesRenderer q={q} />;

    return (
      <div className="p-4 border rounded-lg bg-yellow-50">
        <h3 className="font-semibold mb-2">{q.question_text}</h3>
        <p className="text-gray-600">Unsupported question type: {q.question_type}</p>
      </div>
    );
  };

  return (
    <div className="space-y-6">

      {loading ? (
        <p>Loading question analytics...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : questions.length === 0 ? (
        <p className="text-gray-500">No questions or analytics available for this form.</p>
      ) : (
        <div className="space-y-6">
          {questions.map((q) => (
            <div
              key={q.question_id}
              className="p-4 bg-white rounded-lg shadow flex flex-col items-center"
            >
              {renderChart(q)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
