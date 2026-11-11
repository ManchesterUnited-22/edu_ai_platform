import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

/** topics: progress.topics = [{ topic, correct, total, accuracy, weak }] */
export default function WeakTopicChart({ topics }) {
  const data = topics.map((t) => ({ name: t.topic, percent: Math.round(t.accuracy * 100), weak: t.weak }));
  if (data.length === 0) return <p>Chưa đủ dữ liệu theo chủ đề.</p>;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
        <YAxis domain={[0, 100]} unit="%" />
        <Tooltip />
        <Bar dataKey="percent" name="Đúng">
          {data.map((d) => <Cell key={d.name} fill={d.weak ? '#dc2626' : '#16a34a'} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}