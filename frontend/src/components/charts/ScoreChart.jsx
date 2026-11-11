import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

/** attempts: progress.official.attempts */
export default function ScoreChart({ attempts }) {
  const data = attempts.map((a) => ({ name: `${a.quizTitle} #${a.attemptNo}`, score: Number(a.score) }));
  if (data.length === 0) return <p>Chưa có bài kiểm tra nào.</p>;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
        <YAxis domain={[0, 10]} />
        <Tooltip />
        <Bar dataKey="score" name="Điểm" fill="#2563eb" />
      </BarChart>
    </ResponsiveContainer>
  );
}