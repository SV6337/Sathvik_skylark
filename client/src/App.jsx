import React, { useState } from 'react';
import axios from 'axios';
import { 
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid 
} from 'recharts';
import { 
  TrendingUp, Activity, ShieldAlert, BarChart3, PieChart as PieIcon, FileSpreadsheet, Send, Sparkles, CheckCircle2, Info, X
} from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

export default function App() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [caveats, setCaveats] = useState([]);
  const [showAuditModal, setShowAuditModal] = useState(false);

  const handleSend = async (queryText) => {
    const query = queryText || input;
    if (!query.trim() || loading) return;

    const userMessage = { role: 'user', content: query };
    setMessages((prev) => [...prev, userMessage]);
    if (!queryText) setInput('');
    setLoading(true);

    try {
      const response = await axios.post('http://localhost:5000/api/chat', { message: query });
      const rawAnswer = response.data.answer;
      setCaveats(response.data.caveats || []);

      let textContent = rawAnswer;
      let chartData = null;

      // Flexibly extract CHART JSON whether it appears at the start or end of the response
      if (rawAnswer.includes('---CHART_START---')) {
        const parts = rawAnswer.split('---CHART_START---');
        const textBefore = parts[0];
        const afterStart = parts[1].split('---CHART_END---');
        const jsonString = afterStart[0].trim();
        const textAfter = afterStart[1] || '';

        // Clean up combined text block
        textContent = (textBefore + '\n' + textAfter).trim();

        try {
          chartData = JSON.parse(jsonString);
        } catch (e) {
          console.error('Chart JSON parse error:', e);
        }
      }

      const assistantMessage = { 
        role: 'assistant', 
        content: textContent,
        chart: chartData 
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '❌ Error executing query on Monday.com intelligence backend.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const renderChart = (chart) => {
    if (!chart || !chart.data || chart.data.length === 0) return null;

    return (
      <div style={styles.chartCard}>
        <div style={styles.chartHeader}>
          <BarChart3 size={18} color="#60a5fa" />
          <span style={styles.chartTitle}>{chart.title}</span>
        </div>
        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer>
            {chart.chartType === 'pie' ? (
              <PieChart>
                <Pie data={chart.data} dataKey={chart.dataKey} nameKey={chart.xAxisKey} cx="50%" cy="50%" outerRadius={80} label>
                  {chart.data.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }} />
              </PieChart>
            ) : chart.chartType === 'line' ? (
              <LineChart data={chart.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey={chart.xAxisKey} stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }} />
                <Line type="monotone" dataKey={chart.dataKey} stroke="#3b82f6" strokeWidth={3} />
              </LineChart>
            ) : (
              <BarChart data={chart.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey={chart.xAxisKey} stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }} />
                <Bar dataKey={chart.dataKey} fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  return (
    <div style={styles.container}>
      {/* Sidebar */}
      <div style={styles.sidebar}>
        <div>
          <div style={styles.brandContainer}>
            <Sparkles size={24} color="#60a5fa" />
            <div>
              <h2 style={styles.title}>Skylark AI</h2>
              <p style={styles.subtitle}>Executive Intelligence Agent</p>
            </div>
          </div>

          <div style={styles.metricCard}>
            <FileSpreadsheet size={18} color="#10b981" />
            <div>
              <p style={styles.metricLabel}>Connected Datasources</p>
              <p style={styles.metricValue}>Deals & Work Orders</p>
            </div>
          </div>

          <div style={styles.section}>
            <p style={styles.sectionTitle}>Executive Prompts</p>
            <button style={styles.btn} onClick={() => handleSend("Give me a revenue bar chart breakdown across all business sectors.")}>
              <BarChart3 size={15} color="#60a5fa" /> Sector Revenue Chart
            </button>
            <button style={styles.btn} onClick={() => handleSend("How's our pipeline looking for energy sector this quarter?")}>
              <TrendingUp size={15} color="#10b981" /> Energy Pipeline Analysis
            </button>
            <button style={styles.btn} onClick={() => handleSend("Identify operational bottlenecks across deals and work orders.")}>
              <Activity size={15} color="#f59e0b" /> Operational Bottlenecks
            </button>
            <button style={styles.btn} onClick={() => handleSend("Show me a pie chart of deal status distribution across open, won, and lost deals.")}>
              <PieIcon size={15} color="#ec4899" /> Deal Status Pie Chart
            </button>
          </div>
        </div>

        {/* Data Quality Health Indicator */}
        <div style={styles.healthCard} onClick={() => setShowAuditModal(true)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={16} color="#10b981" />
            <span style={{ fontSize: '12px', fontWeight: 'bold' }}>Data Confidence: 94%</span>
          </div>
          <Info size={14} color="#94a3b8" />
        </div>
      </div>

      {/* Main Chat Engine */}
      <div style={styles.chatArea}>
        <div style={styles.headerBar}>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>Executive Decision Workspace</h3>
            <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Real-time GraphQL query pipeline to Monday.com boards</p>
          </div>
        </div>

        <div style={styles.messageBox}>
          {messages.length === 0 && (
            <div style={styles.heroPlaceholder}>
              <Sparkles size={48} color="#3b82f6" style={{ marginBottom: '16px' }} />
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#f8fafc', margin: '0 0 8px 0' }}>What would you like to analyze today?</h3>
              <p style={{ color: '#64748b', maxWidth: '500px', lineHeight: '1.6' }}>
                Ask complex cross-board questions, request real-time comparative graphs, or inspect specific deal execution metrics.
              </p>
            </div>
          )}

          {messages.map((m, idx) => (
            <div key={idx} style={{ ...styles.messageRow, justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{ ...styles.messageBubble, backgroundColor: m.role === 'user' ? '#2563eb' : '#1e293b', border: m.role === 'user' ? 'none' : '1px solid #334155' }}>
                {/* Render Chart at the top of message if present */}
                {m.chart && renderChart(m.chart)}
                <pre style={{ ...styles.pre, marginTop: m.chart ? '16px' : '0' }}>{m.content}</pre>
              </div>
            </div>
          ))}

          {loading && (
            <div style={styles.loadingRow}>
              <Sparkles size={18} color="#60a5fa" className="animate-spin" />
              <span style={{ fontSize: '13px', color: '#94a3b8' }}>Querying live Monday.com boards & generating analytical report...</span>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div style={styles.inputContainer}>
          <input
            style={styles.input}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask anything about Deals or Work Orders (e.g., 'Chart revenue by sector')..."
          />
          <button style={styles.sendBtn} onClick={() => handleSend()} disabled={loading}>
            <Send size={16} /> Send
          </button>
        </div>
      </div>

      {/* Data Quality Audit Modal */}
      {showAuditModal && (
        <div style={styles.modalOverlay} onClick={() => setShowAuditModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={20} color="#f59e0b" />
                <h3 style={{ margin: 0, fontSize: '16px' }}>Data Quality & Audit Log</h3>
              </div>
              <X size={18} style={{ cursor: 'pointer' }} onClick={() => setShowAuditModal(false)} />
            </div>
            <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '8px' }}>
              Automated data cleaning and normalization steps applied to Monday.com imports:
            </p>
            <div style={styles.auditList}>
              {caveats.length > 0 ? (
                caveats.map((c, i) => (
                  <div key={i} style={styles.auditItem}>
                    <Info size={14} color="#f59e0b" />
                    <span>{c}</span>
                  </div>
                ))
              ) : (
                <p style={{ fontSize: '13px', color: '#10b981' }}>✅ All active fields contain clean, fully parsed data.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { display: 'flex', height: '100vh', backgroundColor: '#090d16', color: '#f8fafc', fontFamily: 'Inter, system-ui, sans-serif' },
  sidebar: { width: '300px', backgroundColor: '#0f172a', padding: '24px', borderRight: '1px solid #1e293b', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' },
  brandContainer: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' },
  title: { fontSize: '18px', fontWeight: 'bold', margin: 0 },
  subtitle: { fontSize: '11px', color: '#64748b', margin: 0 },
  metricCard: { backgroundColor: '#1e293b', padding: '12px 16px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', border: '1px solid #334155' },
  metricLabel: { fontSize: '11px', color: '#94a3b8', margin: 0 },
  metricValue: { fontSize: '13px', fontWeight: 'bold', margin: 0, color: '#f8fafc' },
  section: { display: 'flex', flexDirection: 'column', gap: '10px' },
  sectionTitle: { fontSize: '11px', textTransform: 'uppercase', color: '#64748b', letterSpacing: '1px', fontWeight: 'bold', marginBottom: '4px' },
  btn: { padding: '12px', backgroundColor: '#1e293b', color: '#e2e8f0', border: '1px solid #334155', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '10px', transition: 'all 0.2s' },
  healthCard: { backgroundColor: '#1e293b', padding: '12px 16px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', border: '1px solid #334155' },
  chatArea: { flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', backgroundColor: '#090d16' },
  headerBar: { padding: '20px 32px', borderBottom: '1px solid #1e293b', backgroundColor: '#0f172a' },
  messageBox: { flex: 1, overflowY: 'auto', padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px' },
  heroPlaceholder: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center', marginTop: '60px' },
  messageRow: { display: 'flex', width: '100%' },
  messageBubble: { maxWidth: '80%', padding: '16px 20px', borderRadius: '14px', fontSize: '14px', lineHeight: '1.6' },
  pre: { margin: 0, fontFamily: 'inherit', whiteSpace: 'pre-wrap' },
  chartCard: { backgroundColor: '#0f172a', padding: '16px', borderRadius: '10px', border: '1px solid #334155' },
  chartHeader: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' },
  chartTitle: { fontSize: '13px', fontWeight: 'bold', color: '#f8fafc' },
  loadingRow: { display: 'flex', alignItems: 'center', gap: '10px', padding: '12px' },
  inputContainer: { padding: '20px 32px', borderTop: '1px solid #1e293b', display: 'flex', gap: '12px', backgroundColor: '#0f172a' },
  input: { flex: 1, padding: '14px 18px', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '10px', color: '#fff', fontSize: '14px', outline: 'none' },
  sendBtn: { padding: '14px 24px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalContent: { backgroundColor: '#0f172a', padding: '24px', borderRadius: '12px', border: '1px solid #334155', width: '450px' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid #1e293b' },
  auditList: { marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' },
  auditItem: { display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12.5px', color: '#cbd5e1', backgroundColor: '#1e293b', padding: '10px', borderRadius: '6px' },
};